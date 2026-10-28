# Journey for iPhone

Read the [working agreement](../WORKING_AGREEMENT.md) before making changes.

This is the Xcode starting point for the contextual journey prototype. It hosts the existing reviewed passenger UI in a local WKWebView, with SwiftUI demonstration controls and an optional Apple Foundation Models recovery-preference sheet. It is a hybrid app, not a complete SwiftUI rewrite.

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
- Cancellation opens the existing recovery experience. Enter a request and choose **Understand my priorities on this iPhone**. The model can suggest a priority; the user must confirm it. Only the explicit priority controls deterministic option ranking. No model output creates bookings or entitlements.

The demonstration replays the dated 28 Oct 2026 CX383 fixture. “Real time” means one simulated second per elapsed second, not a live flight. Progress is saved locally using a clock anchor and is recalculated on return; iOS does not need to keep a background timer running. New simulation sessions clear recovery choices but retain saved entertainment. Preferences/saves live in the app's local web storage; the simulation clock lives in native UserDefaults.

## Status and verification

Implemented in source: native host, internal controls, local persistence, native/web bridge, guided/timed playback, event injection and optional on-device preference extraction.

Verified in the Linux cloud workspace: 25 JavaScript/model tests; bundled-HTML browser checks over localhost for native layout, booking, phase/event changes, boarding-pass state and priority bridge. Browser checks use Chromium and do not establish WKWebView compatibility. This managed browser blocks file URLs, so the bundled HTML is served over localhost for those checks.

**Not yet compiled or run with Xcode.** This environment has neither macOS/Xcode nor the iOS SDK. The project includes four XCTest cases for playback, pause/resume, restoration and event handling; run Product → Test on the Mac. Apple Foundation Models behaviour and the actual iPhone UI require device verification.

Not connected: the company's backend, scheduled flight monitoring, push notifications, native Live Activities, actual bookings or live flight inventory. The three existing weather/train calls remain manual browser integrations. No server or credentials have been invented.

## Update the passenger UI bundle

After changing `journey/src`, run `./ios/bundle-web.sh` from the repository. This installs the pinned Node dependencies, builds the existing UI and copies the self-contained result into the app resources. Rebuild in Xcode. The browser walkthrough remains available separately; native host mode removes the simulated phone frame and external trigger navigation.

## Backend connection next

We need the actual backend repository/service and its existing authentication conventions. See `BACKEND-CONTRACT.md` for the proposed integration boundary. Do not put privileged credentials in the app or expose the web bridge to remotely loaded HTML.
