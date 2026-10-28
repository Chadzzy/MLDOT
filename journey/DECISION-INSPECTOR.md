# Journey decision inspector

Implemented 28 October 2026. This is a read-only companion to the passenger
experience, using the existing Supabase project. No separate presenter controls,
new database schema or backend deployment is required for this relay.

## Use

1. Update the existing Mac checkout and run the app from the same Xcode project.
2. Open **Journey simulation → Watch decisions on another screen**.
3. Tap **Start decision inspector**, then **Copy inspector link**. Open that link
   on a laptop. The browser walkthrough has a **Decision inspector** button too.
4. Keep the app active. Move through airport time, worsening weather, delay and
   cancellation using the existing settings. The other screen follows.
5. **Stop sharing decisions** ends publication. Starting again makes a new link.

A late viewer receives the latest snapshot. A disconnected or backgrounded phone
leaves the previous decision visible with a paused/stale label. The relay does
not run the planner while the phone is closed. A new session is needed after an
app reload; this viewing link is not a saved booking or authenticated account.

## What it shows

`journey-planner.js` calculates the next action once. Both the established
passenger module and inspector read its result. Airport actions reserve the same
15-minute walk and 10-minute buffer as `boardingContext`. A flexible lounge visit
needs at least 15 usable minutes and the existing published-rule demo entitlement.
A short entertainment selection needs five minutes near the gate. Treatment
availability is unknown, so the planner does not recommend an appointment.

Worsening **scenario** weather changes the advice to stay nearby without marking
the flight delayed. A confirmed scenario delay with unknown revised boarding time
withholds leisure time. Cancellation uses the same cabin/arrival ranking as the
existing recovery flow. The trace records meaningful changes, not every clock tick.
The last 30 changes remain in memory during this app session.

The inspector also shows the most recently searched real flight, if any, in a
separate section. This observation does not silently replace the fixed demo
itinerary or its clock. No numeric delay prediction or AI model is connected.

## Transport and scope

- Standard [Supabase Realtime protocol](https://supabase.com/docs/guides/realtime/protocol),
  public Broadcast channels, with the existing publishable key. No admin key,
  new identity, project setting change or database write was used.
- A fresh 192-bit random room identifier is generated on explicit start. Treat
  the link as a viewing capability. These are public demo rooms, not authenticated
  operational audit logs; anyone given a link can join the channel.
- Only synthetic rules/timings and public flight observations are broadcast.
  Names, boarding codes, seats, booking IDs, free-text requests and native
  access/refresh tokens are excluded. Phone-side messages cannot change a journey.
- Immediate updates on a changed decision or flight result; ten-second snapshots
  keep the clock current. Phoenix heartbeats and bounded reconnect backoff detect
  lost connections. The viewer marks a snapshot stale after 25 seconds without one.
- Foreground only. Leaving the app closes publication; returning reconnects.
  Scheduled monitoring, push and native Live Activities remain separate work.
- Recorded facts, constraints and rule outcomes are the explanation. No artificial
  chain-of-thought stream, simulated API request or model-performance claim is shown.

## Verification

40 JavaScript checks cover existing journey rules plus shared-planner behaviour,
weather versus flight impact, recovery ranking, history deduplication and malformed
trace rejection. Browser verification uses independent passenger/observer contexts
and genuine hosted Supabase broadcasts. Python provides a CA-verified WebSocket
transport because this cloud Chromium does not trust the managed proxy CA; it
forwards the application's protocol unchanged. This is not a physical iPhone test.

Run `npm test`, `npm run package`, then
`/workspace/.mldot/venv/bin/python tests/inspector_browser.py` in this workspace.
The browser test requires Playwright, websockets 16 and Chromium. It checks the
next-action agreement, worsening weather, cancellation, pause/resume, late join,
stop, mobile overflow and absence of passenger identity in the transmitted packets.
Native build and simulator test evidence is recorded in the delivery record after CI.
