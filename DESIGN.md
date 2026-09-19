# Streetwise design contract

Visual thesis: a calm white-and-forest-green civic map, with readable evidence and reachable actions over a continuous map surface.

Primary workspace: full map. Supporting surface: draggable nearest-first list. Detail: compact marker preview leading to an issue page. Primary action: central circular camera, leading to photo review and My submissions.

Interaction thesis: three-position sheet with direct drag; selected pin/preview transition; restrained progress and timeline motion. Honor reduced motion. No decorative hero or dashboard cards.

## Selected target

`docs/design/selected-home.png` is the merged target shown to the user after they selected toolbar/map/nav from concept 1, pins/list from concept 2, preview from concept 3. Target mobile viewport 390 × 844; desktop uses the same full-map composition with a constrained-width list anchored left.

- Deep forest green #205343, white sheets, gray-green map, ink #153c32, muted #63736e.
- System sans, normal UI 14–16px, strong 20–24px sheet headings. Use existing Lucide icons as the closest available family: map, camera, file-text, navigation, streetlamp and traffic cone.
- Top toolbar is a pill with brand, direct location action, and search. Bottom bar is fixed with three destinations and a round central camera action.
- Pins use white surfaces/green outlines; selection uses a solid green surface. The preview has a photo, title, distance/status, close control, and details action.
- List rows share one white sheet, use separators rather than separate cards, put photos left and distance right, and display text alongside status icons.
- Map/list show distance only after a real location fix; a blue dot reflects foreground position updates. Never claim generated map artwork is accurate geographic data.
- Orange: reported; blue: in progress; green: resolved; spinner: active processing; amber pause: needs attention. Workflow stage never implies government status.

## Scope adjustments for an honest prototype

Keep a compact Demo indicator. Browser preview is an interactive local simulation, never an image passed off as a live session. Tracking explicitly works while the app is open. Photos stay in browser storage. Without a Mapbox token use labeled illustrative map artwork; do not cover a live map failure with demo artwork.

Camera capture uses the OS file/camera picker where supported, with gallery and sample-photo alternatives. Geolocation happens on explicit activation. Desktop adapts naturally; preserve Next.js rather than introducing the plugin's fresh mobile starter.

## Icon fidelity correction

The original source crops remain documented in `docs/design/asset-provenance.md`. On 2026-09-19, the user explicitly authorized SVG replacements after reporting distorted icon proportions on phones. The current implementation uses a custom leaf mark and single-outline category pins, with Lucide SVG controls. Preserve the selected forest-green silhouettes and visual hierarchy; exact source-pixel fidelity is no longer the mobile acceptance requirement. The toolbar is capped at 420px and contracts down to a 320px viewport; address text truncates without pushing search off screen.

## Focused flow refinements

- Locate directly, without a popover or coordinate inputs. No success toast is needed. Failures use a compact white notice capped at 360px below the toolbar, with muted location icon, right-aligned close and retry action.
- Omit nearest-first and origin explanations from the sheet. Retain one compact demo label.
- New issue shows a geographic preview and one short location caption. Do not add another map control toolbar.
- Submission hierarchy: photo/title → current stage and four short steps → current action → optional browser/activity disclosures. Review is compact text with an Edit toggle and explicit approval button. Correction is revealed on request or pause. Keep the green/white system, plain sections and restrained dividers.
