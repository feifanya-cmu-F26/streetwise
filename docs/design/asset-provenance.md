# Demo raster asset provenance

Generated on 2026-09-19 with the built-in ImageGen tool. Each asset was generated separately and visually inspected. These are fictional demo assets, not real civic evidence or authoritative cartography. No UI screenshot was cropped to produce an evidence photo.

| Workspace asset | Dimensions | Source |
| --- | --- | --- |
| `public/images/demo-map.png` | 1024 × 1536 | `exec-3bc0969f-28ce-43ee-9ff3-97eb780851f7.png` |
| `public/images/pothole.png` | 1254 × 1254 | `exec-fb2076d1-7e88-45a6-9673-dd9bb9615c22.png` |
| `public/images/sidewalk.png` | 1254 × 1254 | `exec-61d2256c-2b1f-44d0-a2e2-4b810d3f6506.png` |
| `public/images/street-light.png` | 1254 × 1254 | `exec-5aac0d43-af07-4cca-881a-9f4a0c4ce5ab.png` |
| The discarded atlas candidate | 1448 × 1086 | `exec-4eb1de02-af14-4b9d-ba52-d2a9799b5e02.png` |

The discarded atlas candidate is an **unapproved generated extraction candidate**, not a pixel-exact copy. Its 4-column × 3-row ordering is brand leaf, search, down chevron, map; camera, document, location arrow, streetlight pin; sidewalk pin, default cone pin, selected cone pin, reported badge. Inspection found thicker strokes than the reference, an incorrectly filled navigation arrow, and camera alpha artifacts. Do not claim exact reference fidelity or use it as the final exact asset set without further correction.

## Approved-source deterministic icon extraction

After the generated atlas failed reference fidelity, the user explicitly authorized direct cropping and background removal on 2026-09-19. The assets below come directly from the original pixels of `docs/design/selected-home.png` (853 × 1844). No icon geometry was regenerated or drawn. RGB source pixels are retained; only crop bounds and alpha masks change. The small source resolution limits sharpness when enlarged. Transparent holes replace the surrounding background, including the camera ring; the camera's disconnected white center is retained. White pin interiors and the selected pin's original border remain opaque. Subpixel boundary alpha is an extracted mask, not an assertion that the source originally contained transparency.

| Asset under `public/images/` | Output size | Source crop `(left, top, right, bottom)` |
| --- | --- | --- |
| `design-brand.png` | 39 × 60 | `(58, 84, 103, 152)` |
| `design-brand-lockup.png` | 255 × 60 | `(56, 84, 322, 153)` |
| `design-pin-pothole.png` | 84 × 97 | `(379, 530, 475, 638)` |
| `design-pin-lamp.png` | 70 × 85 | `(108, 353, 182, 445)` |
| `design-pin-sidewalk.png` | 71 × 86 | `(222, 655, 307, 751)` |
| `design-nav-map.png` | 51 × 60 | `(124, 1657, 183, 1721)` |
| `design-nav-camera.png` | 63 × 55 | `(391, 1644, 466, 1710)` |
| `design-nav-submissions.png` | 46 × 57 | `(675, 1652, 728, 1720)` |
| `design-location.png` | 38 × 38 | `(758, 968, 807, 1014)` |
| `design-address-pin.png` | 25 × 35 | `(415, 98, 450, 140)` |
| `design-search.png` | 38 × 38 | `(747, 96, 795, 144)` |
| `design-chevron.png` | 20 × 12 | `(653, 107, 681, 130)` |
| `design-reported.png` | 39 × 40 | `(224, 1287, 269, 1332)` |
| `design-chevron-right.png` | 15 × 25 | `(791, 1270, 813, 1303)` |
| `design-close.png` | 18 × 18 | `(695, 399, 723, 427)` |

Masks use source luminance for dark glyphs and white camera details. Pin masks follow the largest connected green component, fill enclosed holes, and retain the source edge/border. The reported badge mask follows its orange component and preserves the white exclamation mark. Transparent margins are trimmed. All 15 assets were visually inspected together against a gray background; there is no extra generic inner-circle icon or substituted library silhouette. The original combined leaf and Streetwise wordmark is preferred for the header so its lettering is preserved as well. The selected pothole pin was additionally composited at 6× size against magenta: all four corner alpha values are zero, with no rectangular map background or opaque map halo retained; its white border remains visible.

Original generated sources are retained under `/Users/y65ng/.codex/generated_images/01a0bb3d-61a9-7b40-b901-be68d38be60b/`. The app must reference the workspace copies, not those machine-specific sources.

## Map generation prompt

Create a standalone portrait raster background asset for an illustrative DEMO map of Mountain View, California, approximately 1024 by 1536 pixels. Use the attached image ONLY as a reference for the map visual style: light warm gray city blocks, very pale thin building footprints, white streets with thin pale gray outlines, muted sage green parks, several subtly wider roads. Fill the entire image edge-to-edge with the MAP ONLY. No app interface, no header, no bottom sheet, no cards, no pins, no location dots, no icons, no buttons, no logos, no watermark. Quiet sparse dark gray street labels: Castro St, Mercy St, Hope St, Central Expy, Shoreline Blvd, El Camino Real. A medium understated Mountain View neighborhood label near center. The street grid is slightly diagonal to vertical, similar to the attached style. Flat orthographic top-down map illustration, clean polished contemporary map rendering, calm neutral palette. Keep most space lightly textured and uncluttered for later overlay of real HTML interface controls. This is illustrative demonstration cartography, not an authoritative geographic map.

Style reference: selected merged design `/Users/y65ng/.codex/generated_images/01a0b7dc-977e-7fd3-bc48-432a9ce6d28d/exec-4c784937-7962-4825-bd13-c3c5a37fb4d9.png`.

## Pothole generation prompt

Use case: photorealistic-natural. Asset type: square issue evidence photograph for a civic reporting app DEMO. Generate a realistic square 1024 x 1024 daylight smartphone photograph of one medium pothole in weathered gray asphalt on a quiet California residential street. Close oblique downward view with ragged cracked asphalt edges, small loose stones, shallow dark depression and a tiny amount of muddy water. Flaw is centered and occupies about 60 percent of frame, surrounding pavement provides context. Natural unpolished documentary smartphone photo, overcast soft daylight, no dramatic effects, no people, no cars, no text, no logos, no framing, no watermark. This is fictional example evidence, not a real civic report.

## Sidewalk generation prompt

Use case: photorealistic-natural. Asset type: square issue evidence photograph for a civic reporting app DEMO. Create a realistic square 1024 x 1024 daylight smartphone photograph showing an uneven broken concrete sidewalk in a California residential neighborhood. One concrete slab visibly lifted about five centimeters by tree roots, with a clear trip hazard at its joint and a crack. Downward oblique angle, defect centered and occupies about half of frame, grassy verge and a small edge of tree trunk give context near upper left. Concrete is weathered pale gray with granular texture, a few natural dry leaves. Ordinary honest documentary smartphone photo, soft natural daylight, no dramatic processing, no people, no text, no logos, no border, no watermark. Fictional example evidence for a demo, not a real government issue.

## Streetlight generation prompt

Use case: photorealistic-natural. Asset type: square issue evidence photograph for a civic reporting app DEMO. Create a realistic square 1024 x 1024 smartphone photo of a visibly damaged, unlit streetlight at blue hour on a quiet California residential street. Main subject is a tall dark metal pole with a graceful curved arm and a broken downward-drooping lamp head, clearly unlit; a small loose cover hangs from the lamp head making the damage visible. Frame the upper pole and lamp against muted lavender blue evening sky, with just a little dark tree foliage along lower edges. Documentary evidence snapshot, simple natural composition, realistic metal hardware, not dramatic cinematic photography. No people, no text, no logos, no framing, no watermark. Fictional example evidence for demonstration, not a real civic report.
