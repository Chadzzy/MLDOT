# Timing and weather behaviour

## Passenger experience

The journey sheet sits directly above the measured navigation bar at every snap
position. Its maximum height follows the available screen height, keeping a top
margin. The boarding-pass shortcut remains on the sheet. Detail modals continue
to use the supplied modal pattern.

Boarding context comes from the current journey clock and flight, including native
server snapshots. Lounge, airport places, directions, entertainment and rest views
show the relevant timing. An airport recommendation uses a demo allowance of 15
minutes to reach the gate plus a 10-minute buffer. These are planning estimates,
not verified indoor routing. A 50-minute countdown gives at most 25 minutes for a
flexible stop, with a leave-by time. At or inside the allowance, the primary action
becomes heading to the gate. The gate cutoff is not substituted for boarding time.

Unknown revised boarding times do not create extra leisure time. The original
boarding time remains labelled as original. Cancellation or recovery makes the
replacement boarding time pending; no old gate or seat is promised for a new flight.
Treatment durations and availability need confirmation at the lounge.

## Weather escalation

| State | Passenger message | Flight effect |
| --- | --- | --- |
| Settled | Weather outlook settled | None |
| Warning issued | Weather warning; flight unchanged | No delay inferred |
| Conditions worsening | Stay near the gate | No delay inferred |
| Flight impact confirmed | Weather holding departure; revised times pending | Explicit injected delay in this demo |

The fixed HKG–ZRH scenario includes a weather timeline: 22:10 settled, 22:55 warning,
23:15 worsening. Native playback reads these moments from the server-owned journey
clock; it does not query a real forecast for this historical fixture. The in-app
Weather demonstration controls jump to airport/boarding moments and inject the
existing server delay event. The fixture explicitly identifies weather as its delay
cause. Unknown or maintenance causes use different readiness text. Weather never
implies that an aircraft has a maintenance problem.

## Real HKO warnings

In Weather, **Follow live HKO warnings** starts an actual public HKO warning-summary
request, then checks every minute while the app is active. The preference survives
app restarts; responses are fetched again rather than presented as fresh from local
storage. The panel shows the last check and count. Stop disables further checks.
Browser visibility and native scene lifecycle pause checks while inactive and check
again on return (subject to a 55-second minimum interval). Each request has a 12-second
timeout. A failed or stale response is unavailable, never a fabricated all-clear.

These regional warnings are presented separately from the demonstration flight and
its scripted weather. They cannot prove that a specific flight is delayed. There is
no comparison algorithm claiming a storm is getting worse based on warning count.
The current airport-temperature and MTR integration cards remain manual.

This is foreground monitoring, not a deployed background worker. To continue while
the app is closed, the next backend slice must store provider observations and
freshness, schedule bounded HKO checks, deduplicate changes and return observation
snapshots to authenticated journeys. A dated Cathay public-site flight lookup is now available with foreground following;
see [the flight connection](LIVE-FLIGHTS.md). Background flight following still needs
a deployed scheduler and observation storage. Delay causes remain separate simulated inputs unless explicitly sourced. APNs is a later delivery
channel, not a substitute for that worker. No service-role key belongs in the app.

## Verification

`tests/journey-context.test.js` covers budgets, deadlines, unknown delays, cancellation
and weather/cause separation. `tests/context_browser.py` covers all sheet snap positions,
small/large native viewports, readiness and warning polling/background/stop/error
behaviour using explicitly mocked feeds. `tests/live_browser.py` separately calls the
actual public APIs through verified TLS transport and exercises the new opt-in HKO
request. Xcode CI compiles the bundled native host and runs its eight model tests;
physical-device gesture and live-network behaviour still require a walkthrough.

The current native source compiled with Xcode 26.3 and eight simulator tests passed:
[CI evidence](https://github.com/Chadzzy/MLDOT/actions/runs/40656050392). The complete run succeeded, with eight tests and zero failures.
