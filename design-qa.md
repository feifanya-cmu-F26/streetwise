# Focused UX follow-up — 2026-09-19

- Direct locate replaces the popup and all coordinate inputs. A shared foreground watch shows a blue user dot. Browser geolocation emulation moved from 37.3933/-122.081 to 37.3943/-122.080: marker and distances changed; map camera stayed centered at the original point. The photo location preview retained its original snapshot. Test overrides were cleared and the test page reloaded.
- New issue's real Mapbox static preview loaded at naturalWidth=1200. Manual coordinate inputs are absent. Location labels distinguish a demo fallback. No browser permission is requested on initial render.
- Removed nearest-first/origin/footer explanations. Primary navigation, sorting and pin behavior remain.
- Submission review and approval now fit the initial viewport at the inspected 646px width. Browser simulation and activity are collapsed. Verified edit → explicit approve; correction → retry → pause → manual takeover → return → fresh review; manual tracking starts. Existing saved submissions remain compatible.
- Location notices use a capped 360px surface below the toolbar, icon, retry and right-aligned close. Measured at 320/390/768px: widths 288/358/360px, no page overflow. Close removes the notice. Long error text wraps normally.
- Validation: lint/typecheck, 16 tests (including watch updates/cleanup), isolated production build and 15 HTTP smoke checks pass. The existing HTTPS preview was refreshed and displayed the new saved-submission UX.
- Limitation: geolocation movement was emulated; actual walking updates on iPhone require device verification. No live government browser or report submission was introduced.

---

# Mobile reliability follow-up — 2026-09-19

This follow-up supersedes the earlier exact-raster requirement below: the user explicitly approved SVG icons after testing on a phone. Previous screenshots remain historical evidence.

- Reproduced the exact LAN origin failure on port 3001: Next dev returned 403 for its font and Unauthorized for its HMR WebSocket; React handlers were absent. Explicit origin configuration restored HTTP 200 / WebSocket 101, hydration, the Mapbox map, and location controls.
- Verified computed layouts at 320, 390, 625 and 1024 CSS pixels: no horizontal page overflow; toolbar widths 296, 358, 420 and 420 respectively. Brand, location pin/text and search stay inside the pill. Native browser screenshot inspected after resetting emulation; final 565 × 1008 capture is `docs/design/mobile-followup-current.png`.
- Verified native library chooser → local photo resize → description → tab switch and return (draft retained) → submit over LAN HTTP → My submissions. Main tab switching produced no navigation fetch in the observed network interval. Issue detail → Report → browser Back restored issue details.
- Actual pointer dragging expands the sheet. Touch handling now covers both grip and heading. In-app browser cannot dispatch genuine touch events, so physical iPhone dragging and hardware camera remain unverified.
- GPS on the HTTP LAN origin shows an actionable HTTPS message. After explicit user approval, a temporary Cloudflare HTTPS tunnel was connected to the production preview on port 3101. Browser verification returned secureContext=true, geolocationAvailable=true, a loaded Mapbox canvas and no map error. Actual phone GPS permissions/results remain untested.
- `pnpm check`: lint, typecheck and 15 tests passed. The isolated production preview build passed. 15 HTTP smoke checks passed on the rebuilt port-3101 preview.

Status: code fixes and browser checks passed; physical iPhone camera/touch/GPS acceptance remains open.

---

# Design QA — Streetwise

## Findings

- Fixed [P1]: Generic Lucide brand/navigation/pin glyphs differed from the selected design, and the generic pin's inner circle overlapped category icons. After explicit user authorization, original pixels were cropped and background-masked into 15 PNG assets. The combined brand asset preserves the original lettering. Address pin, chevrons, search, location arrow, camera, map/document navigation, and reported marker now use the same source. See `docs/design/asset-provenance.md`.
- Fixed [P2]: Pin selection collapsed the sheet despite the reference showing both preview and list. It now retains the middle sheet position.
- Fixed [P2]: The three demo coordinates overlapped on the real map. Coordinates now have distinct bearings and the initial zoom is closer.
- Fixed [P2]: Mapbox automatically focused the preview link, producing a rectangular focus outline in the mouse-opened popup. `focusAfterOpen={false}` preserves normal keyboard focus styling without that automatic focus.
- Verification blocker: the in-app browser did not retain the requested 390 × 844 override for final capture. Its measured viewport was 625 × 1008. CDP screenshot attempts also had incorrect density/crop behavior and were discarded. Final exact-viewport visual equivalence cannot be claimed. This is a capture/verification limitation, not a confirmed application overflow.

## Evidence and comparison history

- Source visual truth: `docs/design/selected-home.png`, 853 × 1844 pixels, interpreted at approximately 390 × 844 CSS pixels (2.187 source pixels per CSS pixel).
- Final rendered evidence: `docs/design/home-current.png`, 625 × 1008 pixels at a measured 625 × 1008 CSS viewport, density 1. State: real Mapbox map, selected pothole preview, middle sheet, bottom navigation. The captured green rectangle is the pre-fix automatic focus state noted above.
- Full comparison: `docs/design/comparison.png`. Source normalized to 390 × 844 without stretching; implementation kept at its actual CSS dimensions. Different frame widths are explicitly labeled and must not be interpreted as pixel-perfect full-screen matching.
- Focused comparison: `docs/design/comparison-details.png`, showing brand/address, pin/preview, and navigation at CSS scale.
- Initial 390px screenshot showed generic overlapping pin glyphs and an outlined leaf logo. These were rejected by the user. Generated icon reconstruction also failed exact fidelity and was discarded. Final PNGs retain original RGB pixels; alpha masks remove source backgrounds. Final captures show the original tree/wordmark and separate address pin.
- All marker PNG transparent corners and the white selected-pin border were inspected. No opaque rectangular map background remains.

## Required fidelity surfaces

- Typography: original brand lettering is raster-preserved. Product text uses Arial/Helvetica with compact 15px list titles, 23px sheet heading, 12px secondary text. The reference is slightly more spacious; the rendered 625px frame is a responsive intermediate width, not the reference phone width.
- Spacing/layout: floating white toolbar, compact preview, three-height sheet, and fixed camera-centered navigation are present. Keyboard expansion/collapse and actual pointer dragging were exercised. No persistent controls were clipped in the captured viewport.
- Color/tokens: forest green controls, warm white sheet, quiet gray secondary copy, orange reported marker. Extracted icons retain source colors. Actual Mapbox streets differ from the generated reference cartography by design.
- Images/assets: original icon silhouettes and brand lockup are used; generated issue photos remain fictional. Real Mapbox is used when configured; clearly labeled illustrative artwork is used only when no token is configured.
- Copy/content: source hierarchy retained. Additional demo and distance-origin labels are intentional truthfulness additions. Government, community, and workflow status stay separate.

## Interaction checks

Passed browser checks: sample photo → optional text → submit → My submissions → detail; simulated preparation stops at review; correction/retry; pause; manual-intervention form; return to agent; reload restores state; explicit approval uses edited title; scheduled check appears; manual check starts; sheet keyboard controls; actual upward drag; issue detail navigation; community observation does not alter government status. No warnings/errors were captured at the console check. Camera hardware, permission prompts, and production browser takeover were not exercised.

Passed code checks: `pnpm check` (lint/typecheck/13 tests), `pnpm build`, 15 local HTTP smoke checks. Pure transition tests verify resolution after two simulated checks and no automatic approval.

## Remaining checklist

- Capture the final build at a stable 390 × 844 viewport and repeat the full-frame comparison, including the automatic-focus fix.
- Check native camera and geolocation permissions on a real phone before live integration.
- Real AI, remote browser watching/control, and durable government tracking remain outside this prototype.

final result: blocked
