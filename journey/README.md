# Day-of-travel scenario walkthrough

Read the [working agreement](../WORKING_AGREEMENT.md) before making changes.

A website for clicking through journey triggers, with a fixed **375 × 812 CSS-pixel iPhone screen**. The screen is framed as an iPhone and scales proportionally on narrow browsers; it never changes its internal viewport to fit the page. Scenario navigation sits outside the traveller UI.

## Design contract

The user's latest **homepage, persistent journey sheet, expanded boarding pass and weather modal** are the core visual specification. They are not mood-board references. The homepage preserves the member hero, upcoming journey, static recent searches, persistent journey summary and five static bottom navigation items. The expanded sheet uses the reference's coloured situation header, rounded white content, next-action card, boarding pass and Before you fly section. Detail screens use the reference weather modal's position, spacing and back/close treatment.

The other supplied screens provide flow/content requirements. They inherit the core surfaces, type hierarchy and teal/amber/orange state colours. Their layout can adapt within that system.

**Brand and UI pass (27 October):** GT Walsheim fonts (including the user-supplied Medium OTF), the actual Cathay Pacific wordmark, official brushwing and oneworld mark are embedded in the build. The delayed-journey Pier, First panel uses the exact supplied screenshot artwork; the lounge detail uses official Cathay photography. Sources are recorded in `src/assets/sources.json` and `ASSETS.md`. No logo is drawn or typeset by the prototype. Standby is removed; the member header, recent searches and bottom navigation are static. The flight card and journey sheet remain interactive.

**Remaining visual gap:** the exact night-time Hong Kong photograph shown in the supplied screenshot was not found in the attached workspace or any repository branch. A different official Cathay Hong Kong photograph is used provisionally. The original screens folder has now been received as `screens.zip`, but it does not include the clean night-time header photograph or production icon exports. General UI icons still use the existing outline set. Do not claim pixel-perfect fidelity.

The journey sheet follows mouse/touch movement continuously and snaps to collapsed, partial or full height. Pointer distances account for the scaled phone. Header controls also support arrow keys, Home and End. Dialogs animate in and out, controls give press feedback, and reduced-motion preferences are respected. Recovery comparison has a deliberate 500 ms _simulated interaction_ state; this is not an AI call or a live availability search. Real requests display loading placeholders only while those requests run.

Two guided sequences sit outside the phone: **From home to boarding** and **Delay to recovery**. Individual triggers remain available.

## Open the preview

[Open the interactive scenario walkthrough](https://htmlpreview.github.io/?https://raw.githubusercontent.com/Chadzzy/MLDOT/2204f2498c11cc5e66f5a5788713d6026c833f15/ios/JourneyApp/Resources/journey.html). This uses HTML Preview to render the same standalone build bundled with the iPhone source on `codex/iphone-journey`. GitHub Pages itself is not enabled.

The **Decision inspector** button opens sharing controls for a read-only second screen. See [how to use it](DECISION-INSPECTOR.md) and [the flight-intelligence plan](FLIGHT-INTELLIGENCE-PLAN.md).

## Run

```bash
cd /workspace/MLDOT/journey
npm ci
npm run dev
```

The website runs on port **5174**. The separate Siklo app is unchanged. Vite requires Node **22.12+** or a newer supported major; validated on Node 24.19.0.

```bash
npm test
npm run build
npm run format:check
npm run package
```

`deliverables/journey-walkthrough.html` is a self-contained version. The legacy filename `journey-demo.html` is also generated for compatibility. Open the downloaded HTML in a desktop browser, not a document preview. This chat's file-opening feature may be unavailable even when the cloud application is running; changing application code cannot enable that client feature.

## Trigger routes

Twenty routes cover live data connections plus the homepage, open sheet, boarding pass, weather, gate change, gate directions, delay, aircraft readiness, tight connection, cancellation, recovery preferences, selected recovery, included Cathay lounges, airport places, entertainment, rest, documents, sharing and Live Activity preview. Links use URL hashes (`#weather`, `#gate`, `#recovery`, etc.) and support browser back/forward and direct loading. On mobile, a grouped selector exposes the same triggers.

Selecting a trigger clears the previous detail stack and establishes that scenario. Reset restores the homepage while preserving saved entertainment/preferences. The boarding-pass shortcut remains accessible in the persistent sheet and detail modals. Nested modals preserve underlying selections and contain keyboard focus.

## Data boundaries

Traveller, flight and operational information remains **scenario data**. Weather also offers opt-in, once-per-minute foreground HKO warning checks with last-check time and explicit errors. Three public APIs can be called manually from **Call live integrations**: HKO airport temperature, HKO warnings and MTR Airport Express. Live observations carry source/time evidence and remain separate from the sample flight forecast. See [INTEGRATIONS.md](INTEGRATIONS.md). The home scenario starts at **27 October 2026, 22:10 HKT**. Airport, delay, gate and connection triggers advance the scenario clock. The principal sample flight is HKG–ZRH; the connection branch adds a delayed BKK–HKG arrival at 23:15 and uses the same outbound flight, gate and 00:05 cutoff. Its 50-minute interval is not a feasibility guarantee. Weather follows the selected itinerary, including recovery route changes.

`src/providers.js` defines `{ data, evidence }`, a local sample provider and a tested future HTTP adapter. The HTTP adapter is not enabled. Connecting a live flight provider still requires field mapping, freshness behaviour and review of sample-derived copy. Public weather/transit observations have a separate implementation in `src/live-data.js` and `src/LiveData.jsx`. Credentials belong on the server.

`src/model.js` owns scenario overlays, recovery ranking, timezone formatting and the Live Activity representation. Cancellation removes the sample boarding code. Selecting a recovery supersedes the original pass; a replacement remains pending. No ticket, hotel or other service is booked.

`src/venue-directory.json` now contains six verified official Cathay venue records, including Wing Business explicitly closed. Five other lounges have published floor/gate references and hours. The UI derives included lounges from the current traveller’s tier/cabin, excludes closed/non-eligible venues and surfaces temporary access/facility restrictions. There is no eligibility-check button or profile picker in the traveller flow. It does not verify a ticket, membership, live opening or admission. Restaurant/shop pages remain inaccessible. There is no lounge purchase flow.

Entertainment choices can be saved, removed and reordered locally. There is no playback, download or verified onboard catalogue. Jet-lag triggers remain undecided; the rest screen is exploratory. Journey sharing and Live Activities are web previews only, with no published sharing backend, native ActivityKit app or APNs delivery.

## Verification

Start the development server, then run:

```bash
/workspace/.mldot/venv/bin/python tests/browser_smoke.py
```

This uses Python Playwright and `/usr/bin/chromium`; set `JOURNEY_TEST_URL` for another server. Checks cover the original 19 scenario routes, geometry at browser widths 320–1600, nested pass access, keyboard focus, entertainment persistence, cancellation/recovery, included lounges and absence of external requests until live data is requested. The separate `tests/live_browser.py` checks genuine live feeds and explicit failure behaviour. Screenshots/results are saved to ignored `test-results/`.

The standalone HTML is tested over loopback HTTP and then with the browser offline. Direct `file://` testing is blocked by the managed browser's policy; it has not been bypassed.

`tests/ui_polish.py` also exercises real mouse/touch drags on the scaled phone, three snap positions, cancellation, keyboard controls, motion, font loading, brand images and static background scope.

`src/polish.css` provides the embedded fonts, gesture geometry and motion. `src/reference.css` defines the reference layout and fixed phone geometry. `src/scenarios.js` defines the website's trigger navigation. Build outputs and local packages are ignored by Git.

See [EXPERIENCE-REVIEW.md](EXPERIENCE-REVIEW.md) for the complete screen and transition review, fixes and remaining prototype gaps.

See [weather and timing behaviour](WEATHER-AND-TIMING.md) for boarding budgets, cause-aware readiness and escalation.
