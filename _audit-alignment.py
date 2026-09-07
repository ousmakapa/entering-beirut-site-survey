"""Does every dataset the map draws actually sit on the survey lines it is drawn over?

Map 3's fills did not: they came from a coarser extraction and sat a median 2.6 m off the
drawn parcel boundaries, and two of the three conclusions written on that map were wrong
because of it. This checks the rest the same way, so the problem is found before a map is
presented rather than after.

For each dataset it samples vertices and reports the distance to the nearest line on the
layer that dataset is supposed to follow. Correct looks like a median of 0.0000 m.
"""
import json, math, random, re, sys

H = "site-analysis-map.html"
s = open(H, encoding='utf-8').read()
i = s.index("CAD_DATA = /*__CAD_FULL__*/ ") + len("CAD_DATA = /*__CAD_FULL__*/ ")
CAD, _ = json.JSONDecoder().raw_decode(s[i:])

M = 111320.0
C = math.cos(math.radians(33.8966))


def xy(p):
    return (p[1] * M * C, p[0] * M)


def segs_of(rings):
    return [(xy(r[k]), xy(r[k + 1])) for r in rings for k in range(len(r) - 1)]


def d2seg(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L2 = dx * dx + dy * dy
    if L2 == 0:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2))
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def grab(name):
    """The value of `var NAME = ...;` -- these are single-line JSON in this file."""
    m = re.search(r"^[ \t]*var " + name + r" *= *(.*);[ \t]*$", s, re.M)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except Exception:
        return None


def rings_from(v, key=None):
    """Pull [[lat,lng],...] rings out of whatever shape the dataset happens to have."""
    out = []

    def walk(x, depth=0):
        if depth > 6:
            return
        if isinstance(x, list):
            if (len(x) >= 2 and isinstance(x[0], list) and len(x[0]) == 2
                    and all(isinstance(c, (int, float)) for c in x[0])):
                out.append(x)
                return
            for y in x:
                walk(y, depth + 1)
        elif isinstance(x, dict):
            for k, y in x.items():
                if key and k != key and isinstance(y, (list, dict)) and k in ('p',):
                    continue
                walk(y, depth + 1)

    walk(v)
    return [r for r in out if len(r) >= 2]


BASES = {
    'parcels':    segs_of(CAD['parcels']),
    'structures': segs_of(CAD['structures']),
}
BASES['parcels+structures'] = BASES['parcels'] + BASES['structures']

# dataset -> which survey layer it is supposed to lie on
CHECKS = [
    ('PARCEL_FACES',  'parcels',            'Figure-Ground fills and Grain shading'),
    ('HOST_PARCEL',   'parcels',            'parcel 2478, Maps 1-2'),
    ('NEIGHBOURS',    'parcels',            'neighbour parcels, Maps 1-2'),
    ('NEAR_STRUCT',   'structures',         'surveyed structures, Maps 1-2'),
    ('STREET_CAD',    'parcels+structures', 'street space, Maps 5/10/6'),
    ('STREET_SPACE',  'parcels+structures', 'street void'),
    ('buildings',     'structures',         'building outlines'),
    ('roads',         'parcels+structures', 'roads'),
]

random.seed(11)
print("%-16s %-22s %7s %9s %9s %9s  %s" %
      ("dataset", "checked against", "verts", "median", "p90", "max", "verdict"))
print("-" * 96)
bad = []
for name, base, what in CHECKS:
    v = grab(name)
    if v is None:
        print("%-16s %-22s %7s  -- not present --" % (name, base, ""))
        continue
    rings = rings_from(v)
    if not rings:
        print("%-16s %-22s %7s  -- no rings found --" % (name, base, ""))
        continue
    verts = [p for r in rings for p in r]
    sample = random.sample(verts, min(400, len(verts)))
    segs = BASES[base]
    ds = sorted(min(d2seg(xy(p), a, b) for a, b in segs) for p in sample)
    med = ds[len(ds) // 2]
    p90 = ds[int(.9 * len(ds)) - 1]
    verdict = "OK" if med < 0.2 else ("<<< OFF THE LINES" if med > 1.0 else "marginal")
    if med >= 0.2:
        bad.append((name, med, what))
    print("%-16s %-22s %7d %9.4f %9.4f %9.4f  %s"
          % (name, base, len(verts), med, p90, ds[-1], verdict))

print()
if bad:
    print("NEEDS REBUILDING:")
    for n, m, w in bad:
        print("  %-16s median %.2f m off   (%s)" % (n, m, w))
else:
    print("every dataset sits on the survey lines")
sys.exit(0)
