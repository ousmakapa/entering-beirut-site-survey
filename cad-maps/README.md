# Entering Beirut — individual CAD maps

This is the normal, unzipped folder opened by the **CAD Maps** button on the live site.

- `01`–`16` are the approved presentation maps in DXF format.
- Every DXF uses model space at 1:1: **1 drawing unit = 1 metre**.
- Every DXF includes the survey base, project plot, map-specific colours and tags, complete key,
  north arrow and 100 m scale.
- `BOURJ HAMMOUD.dwg` is an unchanged optional copy of the professor's original drawing. The maps
  already work by themselves; use this file only when combining layers with `PASTEORIG`.

To combine a map with the original drawing: open both files, set both to World UCS, use `COPYBASE`
with base point `0,0,0` in the DXF, then use `PASTEORIG` in the DWG.
