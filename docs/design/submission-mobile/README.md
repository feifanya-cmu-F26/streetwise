# Mobile submission detail validation

2026-09-19. Existing Streetwise component rendered through a localhost-only fixture proxy; no user report, government login, or government send was changed. The same component and CSS were deployed to production. This validates responsive UI and local interactions, not real phone/browser-provider keyboard behavior.

1. **Needs input — improved.** Before, a long raw diagnostic occupied the first screen and competing account/resume buttons obscured the browser entry. After, photo/title and four workflow steps precede a concise instruction and one government-browser entry. Full diagnostics remain expandable. See [before](01-before.jpg) and [after](02-after.jpg).
2. **Review — verified.** Report text is readable by default; Edit exposes the existing fields and retains changes when closed. Optional contacts are disclosed separately; required Caltrans email remains expanded. Publication approval is unchanged. See [review](03-review.jpg).
3. **Browser intervention — verified with local fixture.** Open, take control, continue, and pause worked. Continuing removes iframe pointer interaction while automation is active. Anonymous/no-tracking and manual receipt checks remain explicit disclosures. No real website was operated.
4. **Ready to send — verified.** Prepare is complete and Send is current. Final-send button remains disabled before the explicit real-report/review checkbox is selected. No send button was pressed. See [ready](04-ready.jpg).
5. **Submitted and activity — verified with local fixture.** Receipt/reference and status-check action render. Expanded long activity messages stack beneath timestamps without horizontal overflow at 320px; 390px layout also checked. Fixture receipt is not a real government request.

Accessibility checks: labeled controls, semantic progress list with current step, 44px/48px principal touch targets, 16px form inputs, and narrow-width reflow. Full screen-reader and physical iPhone acceptance were not performed.

Validation: `pnpm check` (38 tests), `pnpm build`, production guest integration smoke (26 assertions, disposable records cleaned). Temporary preview servers and browser viewport override were cleaned up after validation.
