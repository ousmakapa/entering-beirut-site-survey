# Entering Beirut — site analysis

ARC 531-13 Design Studio VII, Fall 2026. Built on the instructor's cadastral survey of Bourj
Hammoud (`BOURJ HAMMOUD.dwg`), georeferenced EPSG:22780 → WGS84 and cropped to 580 × 496 m around
the project plot.

**Live:** https://ousmakapa.github.io/entering-beirut-site-survey/

## What it is

**Twenty-one sections** on one shared survey base. Fourteen are evidence; seven argue from it. The
order — `THE PROBLEM · THE BASE · FABRIC · MOVEMENT · ANALYSIS` — puts the conclusion first,
because a site analysis that does not answer an urban problem does not need to exist.

The four problems, each measured on the survey rather than asserted:

- **Cut off** — take the 54.5 m carriageway out of the walkable network and 19,765 m² of public
  space becomes unreachable from the plot, against 19,914 m² that stays. Beyond the corridor, 0%.
  The pedestrian bridge unlocks nothing: both landings sit ~44 m from any walkable public space.
- **No buffer** — 54 large parcels meet 162 small ones along 2,582 m of shared boundary with no
  transition anywhere on it. One shed touches a house plot.
- **No green** — 702 m² within 600 m. This one 1,488.5 m² plot is 2.12× all of it, about
  0.010 m² per person. The only real canopy is private and walled.
- **The corridor's reach** — 50 parcels within 25 m of it, including the plot, with no barrier,
  bund or planting along the 543 m it runs.

And what they converge on: **GIVE** 67 m² · **CROSS** 39 m · **BUFFER** 27.64 m.

## How everything is drawn

Any filled shape is bounded by a line the survey actually draws — a parcel face, a structure
footprint, a street-space polygon, or the plot. No buffers, no unions of grid cells, no shapes
typed in by hand, no stroke widths in screen pixels. `_audit-alignment.py` measures it: the
datasets that should sit exactly on a parcel line read **0.0000 m**. Street space and
reconstructed footprints are the stated exceptions — the edge of a void, and a closure across a
gap in open wall linework, are not survey lines by definition.

Anything inferred is drawn **dashed and faded in the hue of whatever it qualifies**, never in a
colour of its own. The OpenStreetMap green outlines are the clearest case: dashed over the solid
surveyed parcel beneath them, so OSM's 11.0 m median offset from this survey is visible on the
drawing instead of claimed in a caption.

Colours are validated, not chosen by eye — `#12946a / #2a78d6 / #c1443f / #7b52c9` light,
`#22ab7e / #3d84dd / #d55d55 / #9570dd` dark, passing lightness, chroma, CVD separation,
normal-vision floor and contrast in both themes.

Every number is clickable to its own source, and what the survey does **not** record — no heights
anywhere in 45,264 entities, no use, no age, no traffic count, no noise reading — is stated on the
map itself.

## On a phone

Tap **Field** and record buildings, greenery, streets, arrival points and views as you walk.
**Pictures** takes photos, video clips and voice notes against real plots, each stored with where
you stood, the GPS accuracy and which way you were facing. Everything exports as one file.

The page is a single self-contained HTML file — Leaflet and the whole survey are inlined, so it
works with no network once loaded.
