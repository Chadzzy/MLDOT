# Original artwork and typography

The user's `screens.zip` attachment was received and inspected on 27 Oct 2026. It contains 31 PNG references, extracted under `references/screens/`. The source images remain unchanged. Source filenames and SHA-256 hashes are recorded in `src/assets/sources.json`.

- Boarding-pass Cathay Pacific / oneworld lockup: exact region of `screens for DOT/ref-02-bp-app.png`, displayed through an SVG viewport. No recreated wordmark.
- Boarding-code artwork: exact visual region of the supplied app boarding-pass screen, used as a reference image only; cancellation still removes it and recovery supersedes the original pass.
- Boarding-pass benefit tiles: exact region of `CDOT/Contextual sheet.png`. The contextual sheet keeps its icon-only tiles; the standalone pass shows the cabin label from the app boarding-pass reference.
- Delayed-journey lounge image panel: exact region of `CDOT/Contextual sheet_amber.png`, including the original photograph, title and location. No generated or replacement lounge photo in this module.
- Live Activity: implemented from `ref-06-la-states.png` and `ref-06a-la-states.png` with dynamic journey values. This is a browser rendering, not an ActivityKit integration.
- The standalone `brand-logo.png` is the Cathay master-brand lockup; it is retained separately and not substituted for the Cathay Pacific boarding-pass lockup.
- GT Walsheim: exact supplied Medium OTF, with Cathay-published Regular/Bold WOFF2. No synthesized weights.
- General brushwing: official Cathay asset; lounge detail photograph: official Pier First bar photograph. Provenance URLs remain in `sources.json`.

## Remaining assets

The ZIP does not contain the clean homepage night-time Peak header photograph or an exported production icon library. The homepage still uses the previously documented official Cathay daytime HKG image. General outline UI icons remain approximations. No desktop access is needed for the files now received.

The archive includes earlier standby, seat-map and other reference screens. These do not add their functions to the demo: standby remains removed and the homepage remains mostly static, as requested. Venue facts and journey values continue to come from the shared model rather than copying inconsistent fixture values from screenshots.

These assets are used for the requested prototype; their inclusion is not a general redistribution licence.
