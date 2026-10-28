# Journey for iPhone

Read the [working agreement](../WORKING_AGREEMENT.md) before making changes.

This is the Xcode starting point for the contextual journey prototype. It hosts the existing reviewed passenger UI in a local WKWebView, with SwiftUI demonstration controls and an optional Apple Foundation Models recovery-preference sheet. Its Supabase adapter saves demonstration journeys and recovery preferences; the existing passenger UI remains shared with the browser walkthrough.

## Open it

1. On a Mac with **Xcode 26 or later**, open `ios/JourneyApp.xcodeproj`.
2. Select the **JourneyApp** scheme and an iPhone simulator, then press Run. The current HTML bundle is included: no Node setup is needed just to run this snapshot.
3. For your physical iPhone, choose your Apple development team under **Signing & Capabilities**, select the connected phone, and Run. You may need a unique bundle identifier and Developer Mode on the phone.

The app targets iOS 17+. Apple model interpretation requires iOS 26, supported hardware, Apple Intelligence enabled and the system model available. The app checks availability; manual priority selection remains available. Simulator success does not establish on-device model availability.

## Walk through a trip

- Start on the demonstration booking screen. Confirm the HKG–ZRH trip; no payment or ticket is issued.
- The ellipsis button opens **Journey simulation** from inside the app.
- Choose **Guided**, **10-minute playback** or **Real time**. In timed modes, press Play.
- Jump between before departure, HKIA, boarding, in flight and arrival.
- Inject a gate change, delay or cancellation before departure. Injection pauses playback; jumping clears the injected event.
- Under **Weather demonstration**, step through a warning, worsening conditions and an injected weather delay. These are separate from live HKO data.
- In the passenger Weather view, choose **Follow live HKO warnings** to check every minute while the app is active; stopping/backgrounding pauses checks.
- Cancellation opens the existing recovery experience. Enter a request and choose **Understand my priorities on this iPhone**. The model can suggest a priority; the user must confirm it. Only the explicit priority controls deterministic option ranking. No model output creates bookings or entitlements.

The demonstration replays the dated 28 Oct 2026 CX383 fixture. “Real time” means one simulated second per elapsed second, not a live flight. Progress is saved in Supabase using a server clock anchor and recalculated on return; iOS does not need to keep a background timer running. New simulation sessions clear recovery choices but retain saved entertainment. Recovery preferences save to Supabase; drafts, selected itineraries and entertainment remain in local web storage.

## Verification and limits

Hosted Supabase checks passed: anonymous sign-in, journey creation/resume, command
idempotency, server-clock progression and pause, refreshed-session restoration,
saved preferences, stale-version conflicts and isolation between users. The latest
web model tests and Chromium native-host bridge checks also pass, including failed
preference saves preserving the entered text.

**Verified with Xcode 26.3 on a GitHub-hosted Mac runner:** the app and test target
compiled, and all eight XCTest cases passed in an iPhone simulator.
[Build and test evidence](https://github.com/Chadzzy/MLDOT/actions/runs/40638634012) covers source commit `c4ac1e8`; subsequent
documentation changes do not alter that tested native source. The overall run is
marked cancelled because a stop request landed during cleanup after slow simulator
startup; the build/test steps succeeded and the log records eight tests with zero failures.

The CI tests cover journey playback, snapshot validation and command persistence
encoding. They do not verify physical-device UI, end-to-end Keychain/session
restoration, gesture quality or Apple model availability. Those still need a device
walkthrough. Native changes on `codex/iphone-journey` now trigger the Xcode workflow.

Scheduled flight monitoring, push notifications, native Live Activities, real
bookings and live flight inventory remain unconnected. Weather/train calls remain
manual except opt-in foreground HKO warning checks. Selected recovery itineraries and entertainment are local; the server saves
the recovery preference, not a ticket.

## Updating from the first Supabase-connected download

The `856909b` snapshot used the async/await `contentWorld:` label on three WebKit
calls that supplied completion handlers. This causes “Extra trailing closure
passed in call” in `JourneyWebView.swift`. All three now use the callback overload's
`in: .page` label, checked against Apple's documented signature. This corrects the
reported WebKit errors. The nested timer task in `SimulationStore.swift` also now
uses explicit `self` references. Both fixes are included in the passing Xcode build.

## Update the passenger UI bundle

After changing `journey/src`, run `./ios/bundle-web.sh` from the repository. This installs the pinned Node dependencies, builds the existing UI and copies the self-contained result into the app resources. Rebuild in Xcode. The browser walkthrough remains available separately; native host mode removes the simulated phone frame and external trigger navigation.

## Supabase connection

Project `mekjqboywhbtbbabxela` is configured in the included `Resources/supabase.json`.
Only its public client key is bundled. No further project setup is needed for this
snapshot. Internet access is required to confirm a demonstration booking or change
its server state.

The native service creates an anonymous identity, stores and refreshes its session
in Keychain, and keeps credentials out of the web bridge. Returning to the app loads
the saved journey. Reset starts a new journey UUID while retaining the identity and
old server history. Losing the Keychain identity loses access to its journeys;
cross-device recovery needs a permanent linked account and is not implemented.

The server owns the clock. A foreground timer animates its last snapshot; the app
reconciles every 10 seconds (30 seconds after errors) and on foreground return.
This does not monitor flights or run a background phone timer. During a connection
failure, progression freezes, changes are disabled and the settings show Retry.
Uncertain commands are retained in Keychain and retried with the same ID; version
conflicts load the latest state and require reviewing the action again.

Recovery priorities and text save when you request comparisons or confirm the
native preference sheet. A failed save retains the draft and reports the failure.
See [backend setup](../backend/README.md) and [the service boundary](BACKEND-CONTRACT.md).
Never bundle a secret/service-role key or expose the bridge to remotely loaded HTML.

## Timing and sheet refinement

The sheet now stays above the navigation bar at each snap position. Boarding time,
activity allowance and leave-by time share the current journey clock; unknown delays
show timing as unconfirmed. See [weather and timing rules](../journey/WEATHER-AND-TIMING.md).

For an existing Mac checkout, update with `git -C "$HOME/Developer/MLDOT" pull --ff-only`,
then Run the same Xcode project. Do not replace your working folder with another ZIP.

## Real flight lookup

After updating this checkout and running the app, open ••• → Check a real flight. Enter a Cathay flight number and local departure date, then Check flight. Keep checking this flight refreshes while the app is active. No provider key is required for the experimental public-site source. The static HTML preview cannot make this native request. See [scope and verification](../journey/LIVE-FLIGHTS.md).
