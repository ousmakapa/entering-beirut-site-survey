"""Rebuild the Figure-Ground parcel faces so they sit exactly on the drawn survey lines.

The faces that were being filled came from a DIFFERENT extraction than the linework the
map draws, and they had been decimated: cadastral parcel 2478 was a 13-vertex face against
the 38-vertex boundary actually drawn. Measured both ways, face edges and drawn lines
disagreed by a median 2.6 m (90th pct 6.4 m) -- which is exactly the "colours are not
inside the lines" you can see at zoom. The old set also spanned 972 x 1004 m while the
drawn base spans 711 x 573 m, so parcels were being filled in places where the survey
lines are not drawn at all.

This rebuilds them from the same DXF, the same EPSG:22780 -> WGS84 transform, the same
bulge-aware flattening and the same crop as _extract-survey.py, with no simplification.
Same source in, same geometry out, so the fills cannot drift off the lines.

Output: _parcel-faces.json  ->  [{g:[[lat,lng]...], b:0|1, a:area_m2}, ...]
"""
import ezdxf, json, math
from ezdxf import path as ezpath
from pyproj import Transformer
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import polygonize, unary_union
from shapely.strtree import STRtree

D = r"C:\Users\user\AppData\Local\Temp\claude\c--Users-user-Desktop-2026-FALL-Studio-7\787f6c1c-904e-44ad-b477-c53bc4fbb4e0\scratchpad\dwg"
doc = ezdxf.readfile(D + r"\bh.dxf")
msp = doc.modelspace()
to_wgs = Transformer.from_crs("EPSG:22780", "EPSG:4326", always_xy=True)
to_cad = Transformer.from_crs("EPSG:4326", "EPSG:22780", always_xy=True)
TS = json.load(open(D + r"\TRUE_SITE.json"))
CLAT, CLNG = TS["centroid"]
cx, cy = to_cad.transform(CLNG, CLAT)
HW, HH = 290.0, 248.0                      # identical to _extract-survey.py


def inbox(x, y):
    return abs(x - cx) < HW and abs(y - cy) < HH


def flat(e):
    """Identical to the base extractor: honour bulges rather than chording them."""
    t = e.dxftype()
    try:
        if t in ('LWPOLYLINE', 'POLYLINE', 'ARC', 'CIRCLE', 'ELLIPSE', 'SPLINE'):
            p = ezpath.make_path(e)
            return [(v.x, v.y) for v in p.flattening(distance=0.05, segments=8)]
        if t == 'LINE':
            return [(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)]
    except Exception:
        pass
    return []


# Polygonize from a generous radius so faces at the frame edge still close properly,
# then keep only the ones whose centre lands in the drawn crop.
GEN = 600.0
parcel_lines, struct_lines = [], []
for e in msp:
    lay = e.dxf.layer
    if lay not in ('PARCEL$BOUNDARY', 'STRUC$$FOOTPRINT'):
        continue
    pts = flat(e)
    if len(pts) < 2:
        continue
    if not any(abs(x - cx) < GEN and abs(y - cy) < GEN for x, y in pts):
        continue
    closed = getattr(e, 'closed', False) or getattr(e, 'is_closed', False)
    if closed and pts[0] != pts[-1]:
        pts = pts + [pts[0]]
    tgt = parcel_lines if lay == 'PARCEL$BOUNDARY' else struct_lines
    for i in range(len(pts) - 1):
        if pts[i] != pts[i + 1]:
            tgt.append(LineString([pts[i], pts[i + 1]]))

print("parcel segments  %d" % len(parcel_lines))
print("structure segments %d" % len(struct_lines))

faces = [p for p in polygonize(unary_union(parcel_lines)) if p.area > 15]
print("faces polygonized %d" % len(faces))

kept = [f for f in faces if inbox(f.centroid.x, f.centroid.y)]
print("faces inside the drawn crop %d" % len(kept))

# built = the survey records structure linework inside the parcel
tree = STRtree(struct_lines)
out, built = [], 0
for f in kept:
    hit = any(struct_lines[i].intersects(f) for i in tree.query(f))
    ring = []
    for x, y in f.exterior.coords:
        lo, la = to_wgs.transform(x, y)
        ring.append([round(la, 6), round(lo, 6)])
    out.append({"g": ring, "b": 1 if hit else 0, "a": int(round(f.area))})
    built += 1 if hit else 0

json.dump(out, open("_parcel-faces.json", "w"), separators=(",", ":"))

vac = [f for f in out if not f["b"]]
ba = sum(f["a"] for f in out if f["b"])
va = sum(f["a"] for f in vac)
print("\n%d faces | built %d (%.0f%%, %s m2) | vacant %d (%.0f%%, %s m2)"
      % (len(out), built, 100 * built / len(out), f"{ba:,}",
         len(vac), 100 * len(vac) / len(out), f"{va:,}"))
print("mean vertices per face %.1f  (the old set averaged 5.0)"
      % (sum(len(f["g"]) for f in out) / len(out)))
