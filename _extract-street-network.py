"""Turn the public-space blobs into an actual street network.

WHY. Streets was classifying whole pieces of open space by the widest circle that fits
inside them. That is wrong twice over. Four of the five "26 m and over" pieces are not
streets at all -- their elongation (length/width) is 1.1 to 2.2, so they are yards and open
ground, not roads. And the one that IS a street network, 32,853 m2, was labelled "54.5 m
wide" when 54.5 m is its widest single point; it is really 603 m of connected route whose
width varies along its length. 22% of the mapped "public space" area sits in pieces that
are not street-shaped at all.

WHAT THIS DOES INSTEAD.
  1. rasterise the public space at 1 m
  2. skeletonise it -> centrelines (the medial axis of the void)
  3. distance transform -> the LOCAL half-width at every point on the centreline, so each
     stretch of street carries its own width instead of its blob's maximum
  4. build a graph, prune spurs shorter than 12 m (skeleton artefacts, not streets)
  5. edge betweenness centrality, length-weighted -- how many of the shortest routes
     between all junctions and all entry points use each stretch

That last one is the closest thing to "traffic" that can honestly be derived here. It is
GEOMETRY, not a count: no traffic survey, no vehicle data and no one-way information exists
for this site, and none is in the DWG. It measures how central a street is to getting
across this piece of city, which is what makes streets busy -- but it is a prediction from
shape, and the map says so.

Output: _street-network.json -> [{g:[[lat,lng]...], w, len, bt}]
"""
import json, math
import numpy as np
from scipy import ndimage
from skimage.morphology import skeletonize
import networkx as nx
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
from pyproj import Transformer

to_cad = Transformer.from_crs("EPSG:4326", "EPSG:22780", always_xy=True)
to_wgs = Transformer.from_crs("EPSG:22780", "EPSG:4326", always_xy=True)

SS = json.load(open("_street-space.json"))


def geom(r):
    g = Polygon([to_cad.transform(lo, la) for la, lo in r["o"]],
                [[to_cad.transform(lo, la) for la, lo in h] for h in (r.get("h") or [])])
    return g if g.is_valid else g.buffer(0)


pub = unary_union([geom(r) for k in ('primary', 'secondary', 'local', 'lane')
                   for r in SS[k]]).buffer(0)
minx, miny, maxx, maxy = pub.bounds
S = 1.0
W = int((maxx - minx) / S) + 2
Hh = int((maxy - miny) / S) + 2
print("raster %d x %d at %.1f m" % (W, Hh, S))

# ---- rasterise -------------------------------------------------------------------
from shapely.prepared import prep
pp = prep(pub)
mask = np.zeros((Hh, W), dtype=bool)
for j in range(Hh):
    y = miny + j * S
    for i in range(W):
        if pp.contains(Point(minx + i * S, y)):
            mask[j, i] = True
print("public-space cells:", int(mask.sum()))

# ---- centrelines + local width ---------------------------------------------------
dt = ndimage.distance_transform_edt(mask) * S          # metres to the nearest edge
skel = skeletonize(mask)
print("skeleton cells:", int(skel.sum()))

# ---- graph ------------------------------------------------------------------------
G = nx.Graph()
idx = {}
ys, xs = np.nonzero(skel)
for j, i in zip(ys, xs):
    idx[(j, i)] = True
for j, i in zip(ys, xs):
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1):
            if dj == 0 and di == 0:
                continue
            n = (j + dj, i + di)
            if n in idx:
                G.add_edge((j, i), n, weight=S * math.hypot(dj, di))
print("skeleton graph: %d nodes, %d edges" % (G.number_of_nodes(), G.number_of_edges()))

# ---- collapse chains of degree-2 pixels into polylines ----------------------------
def trace(g):
    nodes = [n for n in g if g.degree(n) != 2]
    seen = set()
    lines = []
    for n in nodes:
        for nb in list(g.neighbors(n)):
            if (n, nb) in seen:
                continue
            path = [n, nb]
            seen.add((n, nb)); seen.add((nb, n))
            cur, prev = nb, n
            while g.degree(cur) == 2:
                nxt = [x for x in g.neighbors(cur) if x != prev][0]
                seen.add((cur, nxt)); seen.add((nxt, cur))
                path.append(nxt); prev, cur = cur, nxt
            lines.append(path)
    return lines


lines = trace(G)
print("raw polylines:", len(lines))

# ---- prune spurs: a dead end shorter than 12 m is a skeleton artefact -------------
def plen(p):
    return sum(S * math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1])
               for k in range(len(p) - 1))


for _ in range(4):
    deg = {}
    for p in lines:
        for e in (p[0], p[-1]):
            deg[e] = deg.get(e, 0) + 1
    keep = [p for p in lines
            if not ((deg.get(p[0], 0) == 1 or deg.get(p[-1], 0) == 1) and plen(p) < 12.0)]
    if len(keep) == len(lines):
        break
    lines = keep
print("after pruning spurs under 12 m:", len(lines))

# ---- build, then CLEAN, the network ------------------------------------------------
# The raw skeleton puts several adjacent pixels at every junction, so tracing produces a
# rash of 1-3 m edges and betweenness becomes meaningless -- the "busiest street" came out
# as a 1 m stub. Two passes fix it: contract any edge under 8 m that touches a junction,
# then merge straight through every remaining degree-2 node so a street is one edge.
H = nx.Graph()
for p in lines:
    a_, b_ = p[0], p[-1]
    L = plen(p)
    if a_ == b_ or L <= 0:
        continue
    if H.has_edge(a_, b_) and H[a_][b_]['weight'] <= L:
        continue
    H.add_edge(a_, b_, weight=L, path=p)
print("traced network: %d nodes, %d edges" % (H.number_of_nodes(), H.number_of_edges()))

changed = True
while changed:
    changed = False
    for a_, b_, d in list(H.edges(data=True)):
        if d['weight'] < 8.0 and (H.degree(a_) >= 3 or H.degree(b_) >= 3):
            if not H.has_edge(a_, b_):
                continue
            keep, drop = (a_, b_) if H.degree(a_) >= H.degree(b_) else (b_, a_)
            H = nx.contracted_nodes(H, keep, drop, self_loops=False, copy=True)
            changed = True
            break
print("after contracting junction clusters: %d nodes, %d edges" % (H.number_of_nodes(), H.number_of_edges()))

changed = True
while changed:
    changed = False
    for n in list(H.nodes()):
        if H.degree(n) != 2:
            continue
        (x, dx), (y, dy) = list(H[n].items())
        if x == y:
            continue
        px, py = dx.get('path', [n, x]), dy.get('path', [n, y])
        if px[0] == n: px = px[::-1]
        if py[-1] == n: py = py[::-1]
        merged = px + py[1:]
        w = dx['weight'] + dy['weight']
        if not H.has_edge(x, y):
            H.add_edge(x, y, weight=w, path=merged)
            H.remove_node(n)
            changed = True
            break
print("after merging through degree-2 nodes: %d nodes, %d edges" % (H.number_of_nodes(), H.number_of_edges()))

H.remove_edges_from(nx.selfloop_edges(H))
bt = nx.edge_betweenness_centrality(H, weight='weight', normalized=True)
mx = max(bt.values()) if bt else 1.0

# ---- export ------------------------------------------------------------------------
out = []
for (a, b), v in bt.items():
    p = H[a][b]['path']
    widths = [2 * dt[j, i] for j, i in p]
    widths.sort()
    ring = []
    from shapely.geometry import LineString
    ls = LineString([(minx + i * S, miny + j * S) for j, i in p]).simplify(1.2)
    for x, y in ls.coords:
        lo, la = to_wgs.transform(x, y)
        ring.append([round(la, 6), round(lo, 6)])
    if len(ring) < 2 or H[a][b]["weight"] < 10:
        continue                      # 1-3 m stubs are junction artefacts, not streets
    out.append({"g": ring,
                "w": round(widths[len(widths) // 2], 1),
                "len": round(H[a][b]['weight']),
                "bt": round(v / mx, 3)})
out.sort(key=lambda r: -r["bt"])
json.dump(out, open("_street-network.json", "w"), separators=(",", ":"))

import os
tot = sum(r["len"] for r in out)
print("\n%d street segments, %s m of centreline, json %.0f KB"
      % (len(out), f"{tot:,}", os.path.getsize("_street-network.json") / 1024))
ws = sorted(r["w"] for r in out)
print("segment width: min %.1f  median %.1f  max %.1f m" % (ws[0], ws[len(ws) // 2], ws[-1]))
print("\nthe ten busiest stretches by through-route load:")
for r in out[:10]:
    print("   load %.2f   %4d m long   %5.1f m wide" % (r["bt"], r["len"], r["w"]))
