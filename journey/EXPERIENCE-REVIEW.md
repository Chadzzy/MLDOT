# Whole-experience review — 27 October 2026

Reviewed every one of the 20 trigger routes, including the top and bottom scroll states, then exercised the connected journeys and nested screens. Review evidence is in `test-results/experience-review/`: individual screenshots, contact sheets, request records and the complete screen text. This is an experience review of the current implementation; exact asset matching remains pending the original desktop folder.

## Corrections made

- The guided gate-change → boarding-pass transition now retains Gate 62, including after a reload, instead of resetting to Gate 68.
- “Head to the airport” opens a ground-transport screen. Airport/lifestyle moments advance the scenario clock and stop telling a traveller already at HKIA to leave home.
- The connection countdown, gate, outbound boarding pass and Live Activity use the same journey. The fixture arrives at 23:15, boards at 23:45 and closes at 00:05. The 50-minute interval does not assert a successful connection.
- Weather shows the relevant itinerary: one flight for a Hong Kong departure, the inbound leg for the connection branch, and the selected airline/routing after recovery.
- Cancelled and superseded flights no longer offer original seat, upgrade or included-lounge actions. Replacement itineraries do not inherit the original seat, terminal, gate or boarding time.
- Sharing/rest screens identify original scheduled arrival when delayed or cancelled and new arrival after recovery.
- Removed the remaining “explore eligibility” prompt and nonfunctional airport-preference controls. Lounge access is applied to the current profile; changed itineraries do not inherit an admission claim.
- Gate-change header height now follows its content, avoiding clipped copy. The sheet still drags continuously to three positions.
- Recovery steps reset scroll position, focus the new heading and animate the content. Results no longer start halfway down the options. Comparison feedback is a 500 ms simulated interaction, not a live inventory/AI call.
- Secondary cards now use the same teal, white, grey and pale teal surfaces. Removed the scenario-workbench button from inside the Live Activity screen; scenario navigation remains outside the phone.
- The illustrative gate diagram responds to the selected starting landmark.

## Screens inspected

| Screen/trigger     | Review focus                                                            |
| ------------------ | ----------------------------------------------------------------------- |
| Live integrations  | Loading, real results, source timestamps and independent error handling |
| Home               | Static background, flight card, persistent sheet, original-asset gap    |
| Journey sheet      | Mouse/touch drag, partial/full height, scroll and pass access           |
| Boarding pass      | Actual logo, uploaded font, fields, gate changes, invalidation          |
| Weather            | Current vs scenario data, itinerary changes, layout                     |
| Gate change        | Copy visibility, diagram, pass consistency                              |
| Directions         | Origin selector, schematic response, instructions                       |
| Delay              | Unknown departure, readiness, included lounge                           |
| Aircraft readiness | Timeline, completed-count accuracy, unconfirmed timing                  |
| Tight connection   | Midnight cutoff, countdown, nested pass and sharing                     |
| Cancellation       | Recovery entry, removed original entitlements                           |
| Recovery           | Preferences, loading, ranking, confirmation, scrolling and focus        |
| Recovery selected  | New itinerary, original pass superseded, pending replacement            |
| Cathay lounge      | Included access, current notices, details, directions, alternatives     |
| Airport places     | Lounge card, entertainment entry, pending dining directory              |
| Entertainment      | Save/remove/reorder, empty queue, persistence, nested pass              |
| Rest               | Arrival context, selected entertainment, deferred trigger design        |
| Travel documents   | Checkboxes, changed route, nested pass preservation                     |
| Sharing            | Toggles, empty selection, original vs new arrival                       |
| Live Activity      | Scenario-derived state, deep link, web-preview boundary                 |

Also inspected the ground-transport screen, nested lounge directions, recovery options/confirmation/completion and both guided sequences. Keyboard focus, Escape/back, proportional phone scaling, reduced motion and interrupted drags are exercised by the existing UI checks.

## Remaining gaps

The exact night-time header photo and production UI icons are still unavailable. The user clarified that the originals are on their desktop; a ZIP attachment is needed to make those files available in this cloud environment. The current public build uses verified brand marks, the supplied GT Walsheim Medium font and official Cathay lounge photography.

Dining/shop listings, personalised jet-lag triggers, Timatic-like checks, real flight/rebooking data, media playback, secure cross-device sharing and native iOS Live Activities are unfinished or simulated. Their current screens are concepts, not completed integrations. HKO weather/warnings and MTR train requests are real. The gate diagrams and boarding code are illustrative.

## Original ZIP artwork pass — 27 Oct 2026

Inspected all 31 uploaded PNG references. Replaced the pass logo, contextual benefit icons and boarding-code pattern with exact regions of the supplied artwork, retaining live model text and invalidation behaviour. The delay sheet now shows the original lounge panel. Live Activity uses the supplied compact flight/terminal/status layout and a contextual action strip. The original master-brand logo is retained separately from the boarding-pass lockup.

Rechecked all 20 triggers and scroll positions, connected journey transitions, touch/mouse sheet gestures, keyboard controls, reduced motion and model tests. Manually inspected the pass, delayed lounge and Activity renders. The clean homepage night-time photograph and production icon library are not in this archive; those remain the documented visual gaps. Standby functionality remains excluded.
