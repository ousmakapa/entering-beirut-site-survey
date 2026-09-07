"""Rebuild the public-space polygons so they sit on the survey lines they are drawn over.

STREET_CAD sat a median 3.66 m off the drawn parcel boundaries -- it came from the same
coarse extraction that put the Figure-Ground fills outside the lines. It feeds Maps 5
(Streets), 6 (Corridor) and 10 (Access), so all three inherited the error.

The public realm is not a layer in the DWG. It is the space the survey leaves BETWEEN the
parcel blocks, so it is derived here rather than drawn: take every parcel face, union them
into blocks, and the void that remains is the public space. The class of each piece is its
own width, measured by morphological opening -- the parts of the void where a disc of
radius r fits are exactly the parts at least 2r wide:

    primary    >= 26 m   opening radius 13.0     secondary  16-26 m   radius 8.0
    local       9-16 m   radius 4.5              lane      under 9 m  the remainder

Same DXF, same EPSG:22780 -> WGS84 transform, same bulge-aware flattening and same crop as
_extract-survey.py, so the result cannot drift off the drawn lines.

Output: _street-space.json -> {primary:[{o,h,w,a,name}], secondary:[...], local:[...],
                               lane:[...], labels:{...}}
"""
import ezdxf, json, math
from ezdxf import path as ezpath
from pyproj import Transformer
from shapely.geometry import Polygon, MultiPolygon, LineString, Point, box
from shapely.ops import polygonize, unary_union

D = r"C:\Users\user\AppData\Local\Temp\claude\c--Users-user-Desktop-2026-FALL-Studio-7\787f6c1c-904e-44ad-b477-c53bc4fbb4e0\scratchpad\dwg"
doc = ezdxf.readfile(D + r"\bh.dxf")
msp = doc.modelspace()
to_wgs = Transformer.from_crs("EPSG:22780", "EPSG:4326", always_xy=True)
to_cad = Transformer.from_crs("EPSG:4326", "EPSG:22780", always_xy=True)
TS = json.load(open(D + r"\TRUE_SITE.json"))
CLAT, CLNG = TS["centroid"]
cx, cy = to_cad.transform(CLNG, CLAT)
HW, HH = 290.0, 248.0
CROP = box(cx - HW, cy - HH, cx + HW, cy + HH)


def flat(e):
    t = e.dxftype()
    try:
        if t in ('LWPOLYLINE', 'POLYLINE', 'ARC', 'CIRCLE', 'ELLIPSE', 'SPLINE'):
            return [(v.x, v.y) for v in ezpath.make_path(e).flattening(distance=0.05, segments=8)]
        if t == 'LINE':
            return [(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)]
    except Exception:
        pass
    return []


GEN = 700.0
lines, struct_lines, names = [], [], []
for e in msp:
    lay = e.dxf.layer
    if lay == 'STREET$TEXT' and e.dxftype() in ('TEXT', 'MTEXT'):
        try:
            p = e.dxf.insert
        except Exception:
            continue
        txt = (e.dxf.text if e.dxftype() == 'TEXT' else e.text).replace('\\P', ' ').strip()
        if txt:
            names.append((p.x, p.y, txt))
        continue
    if lay not in ('PARCEL$BOUNDARY', 'STRUC$$FOOTPRINT'):
        continue
    pts = flat(e)
    if len(pts) < 2 or not any(abs(x - cx) < GEN and abs(y - cy) < GEN for x, y in pts):
        continue
    if (getattr(e, 'closed', False) or getattr(e, 'is_closed', False)) and pts[0] != pts[-1]:
        pts = pts + [pts[0]]
    tgt = lines if lay == 'PARCEL$BOUNDARY' else struct_lines
    for i in range(len(pts) - 1):
        if pts[i] != pts[i + 1]:
            tgt.append(LineString([pts[i], pts[i + 1]]))

faces = [p for p in polygonize(unary_union(lines)) if p.area > 15]

# Parcel faces alone are not enough. Parts of this district carry no cadastral parcel at
# all -- the industrial land north of the plot is one -- so the gap between parcels there
# is private ground with sheds standing on it, not public space. Taken on parcels alone
# this drawing called the plot's north side a 38.8 m public frontage, when the edge
# drawing (correctly) calls it a party wall with a shed 2.9 m away. So the built area is
# treated as block too: a morphological closing of the wall linework, radius 3 m, which
# solidifies rooms and yards without bridging anything wider than 6 m.
# A 3 m closing alone leaves the inside of a big shed hollow -- the wall outline becomes a
# 6 m band with a hole in it -- so the void reappeared inside the buildings. Polygonizing the
# wall linework recovers 141 enclosed faces (63,667 m2) where walls actually meet; the closing
# then catches the rest. Together: 98,711 m2 of built ground.
_su = unary_union(struct_lines)
built = unary_union([f for f in polygonize(_su) if f.area > 20] + [_su.buffer(3.0).buffer(-3.0)]).buffer(0)
blocks = unary_union(list(faces) + [built]).buffer(0)
print("parcel faces %d + built area %s m2  ->  blocks %s m2"
      % (len(faces), f"{built.area:,.0f}", f"{blocks.area:,.0f}"))

# The surveyed envelope: close the block pattern so the streets between blocks are enclosed,
# but the empty world beyond the last block is not.
CLOSE = 35.0
env = blocks.buffer(CLOSE).buffer(-CLOSE)
void = env.difference(blocks).intersection(CROP).buffer(0)
print("public void inside the crop: %s m2" % f"{void.area:,.0f}")

BANDS = [('primary', 13.0), ('secondary', 8.0), ('local', 4.5)]
opened, prev = {}, None
for key, r in BANDS:
    o = void.buffer(-r).buffer(r).buffer(0)          # morphological opening
    opened[key] = o
    print("  %-9s width >= %4.1f m : %s m2" % (key, 2 * r, f"{o.area:,.0f}"))

parts = {}
parts['primary'] = opened['primary']
parts['secondary'] = opened['secondary'].difference(opened['primary']).buffer(0)
parts['local'] = opened['local'].difference(opened['secondary']).buffer(0)
parts['lane'] = void.difference(opened['local']).buffer(0)


def polys(g):
    if g.is_empty:
        return []
    return list(g.geoms) if isinstance(g, MultiPolygon) else [g]


def ring(coords):
    out = []
    for x, y in coords:
        lo, la = to_wgs.transform(x, y)
        out.append([round(la, 6), round(lo, 6)])
    return out


def nearest_name(p):
    if not names:
        return None
    d, best = min(((math.hypot(p.centroid.x - x, p.centroid.y - y), t) for x, y, t in names))
    return best if d < 70 else None


MIN = {'primary': 60, 'secondary': 40, 'local': 25, 'lane': 12}
out = {}
for key in ('primary', 'secondary', 'local', 'lane'):
    recs = []
    for g in polys(parts[key]):
        if g.area < MIN[key]:
            continue
        w = 2 * g.area / g.length if g.length else 0        # mean width of an elongated piece
        recs.append({"o": ring(g.exterior.coords),
                     "h": [ring(i.coords) for i in g.interiors],
                     "a": int(round(g.area)),
                     "w": round(w, 1),
                     "name": nearest_name(g)})
    recs.sort(key=lambda r: -r["a"])
    out[key] = recs
    print("%-9s %3d pieces, %s m2" % (key, len(recs), f"{sum(r['a'] for r in recs):,}"))

out['labels'] = {
    'primary':   'Wide corridor \u2014 26 m and over between plots',
    'secondary': '16\u201326 m',
    'local':     '9\u201316 m',
    'lane':      'under 9 m \u2014 lane, yard or open ground',
}
json.dump(out, open("_street-space.json", "w"), separators=(",", ":"))

# ---- what this says about the plot, for the notes ----
plot = Polygon([to_cad.transform(lo, la) for la, lo in TS["ring"]])
print("\nthe public space each side of the plot touches:")
for key in ('primary', 'secondary', 'local', 'lane'):
    for r in out[key]:
        g = Polygon([to_cad.transform(lo, la) for la, lo in r["o"]])
        d = g.distance(plot)
        if d < 3:
            print("  %-9s %6s m2  mean width %5.1f m  at %.2f m from the plot  %s"
                  % (key, f"{r['a']:,}", r["w"], d, r["name"] or ""))
tot = sum(sum(r['a'] for r in out[k]) for k in ('primary', 'secondary', 'local', 'lane'))
print("\npublic space %s m2 of %s m2 surveyed  (%.0f%%)"
      % (f"{tot:,}", f"{env.intersection(CROP).area:,.0f}",
         100 * tot / env.intersection(CROP).area))
