# Real flight lookup in the simulation

## Scope agreed 28 October 2026

This is a simulated passenger experience grounded in real flight observations.
Ticket servicing, actual bookings and real queues are not integration requirements.
Use a small HKIA venue database, simulated queues and pre-flight media selections.
Do not block the demonstration on operational fulfilment systems.

## Working source

The normal search form on [Cathay's public flight-status page](https://www.cathaypacific.com/cx/en_HK/prepare-trip/flight-status.html)
made a public flight-number/date request which returned HTTP 200 without an account,
cookies or API key. The same normal server request was repeated successfully.
The source returned CX334 HKG–PEK and CX383 HKG–ZRH, including scheduled, estimated
and actual times, status, terminal, gate and aircraft type where available.

A genuine browser-to-development-server check for **CX383 departing 29 October
2026** returned HKG–ZRH, scheduled departure **00:45 HKT**, scheduled arrival
**07:25 Zurich local**, status **ON TIME**, Terminal 1 and an unpublished gate.
The boarding estimate displayed **00:05 HKT**, calculated from STD minus 40 minutes.
These are observations from the check, not a permanent schedule fixture.

The website service is experimental, not a contracted developer API. It can change
or become unavailable. Failure never substitutes a simulated result. Its CORS
header permits Cathay's website, so the static HTML preview cannot call it directly.
A browser-origin-null experiment returned 403. The normal server request succeeds;
no cookies, credentials or forged Origin/Referer are used. Access errors are not
retried through alternate hosts or denied endpoints.

## Use in the app

Open **••• → Check a real flight**, enter a
Cathay flight number and its **local departure date**, then tap **Check flight**.
The app uses a fixed-source URLSession adapter; the web view cannot choose arbitrary
URLs, headers or credentials. The response is validated and normalised in the shared
JavaScript module. Source update time and retrieval time stay separate.

**Keep checking this flight** repeats the chosen lookup once per minute while the
app is active, including after the panel is closed. It pauses while inactive and
checks on return if due. Manual checks have a 30-second minimum interval. Failures
retain the previous result with an error label. A five-minute-old source observation
is labelled as a last update even if it was just fetched. Monitoring is session-only;
it is not a deployed backend scheduler and does not run after the app is closed.

These results do not replace the server-owned demonstration itinerary yet. Injected
cancellation, recovery and queues remain simulations; they cannot mutate real flight
observations. The next product step is selecting a real flight as the basis of a
simulated booking, with separate demo events and clock ownership.

## Countdown rules

- Estimated boarding = scheduled departure minus 40 minutes.
- Estimated gate close = scheduled departure minus 20 minutes.
- Existing activity rules reserve 15 minutes walking plus a 10-minute buffer.
- These are simulation/planning rules, not reported boarding times.
- An uncertain or delayed departure does not automatically extend activity time.
- Preserve local dates and each field's source UTC offset; Hong Kong midnight and
  Zurich winter time must not be conflated.

## Development and checks

`python3 backend/flight_lookup.py --flight CX383 --date YYYY-MM-DD` performs one
actual source request. `npm run dev` in `journey/` adds a fixed-source development
endpoint used by the same UI. Neither deploys a new backend service.

`npm test` includes query/date validation, source error handling, UTC offsets,
unknown fields, STD-based timing and staleness. `tests/flight_browser.py` performs one
genuine lookup through the local development adapter and takes a screenshot.
`tests/flight_monitor_browser.py` uses explicitly simulated bridge responses to check
panel-close persistence, updates, lifecycle pause/resume, failure retention and stop.
These browser checks do not prove URLSession connectivity on a physical iPhone.
Native changes must pass the existing Xcode CI before handoff.

## Other data prepared

- `src/venue-directory.json` retains the six curated Cathay lounge records and now
  has a separate HKIA restaurant collection, starting with Duddell's official
  airport address. The Central restaurant's footer hours are deliberately excluded.
  Queue and dining durations are explicitly simulated. The restaurant collection
  is not yet wired into the venue UI.
- `data/cathay-entertainment-2026-10.json` contains six actual Cathay editorial picks.
- `data/music-shortlist.json` contains two real Apple iTunes music results with
  artist, duration and source link. No audio or artwork was downloaded. These records
  are prepared for the media UI; existing selection cards have not been replaced.
- ADSB.lol's documented open API returned aircraft near HKG, including Cathay
  callsigns, positions, registrations and aircraft types. A second check returned
  changed observations. This is an optional map source, not gate/schedule authority;
  it is not connected to the UI. Attribution/licensing: ODbL 1.0.

Source inspection evidence remains in `/workspace/research/day-of-travel/live-flight-discovery/`.

## Delivery verification

Source `35e4286` passed the [Xcode 26.3 build and all eight simulator tests](https://github.com/Chadzzy/MLDOT/actions/runs/40656050392). All 35 JavaScript tests passed. A real CX383 lookup passed through the development server and UI; bridge lifecycle/error tests and the existing timing/sheet checks passed. The bundled HTML matches the reviewed web build. Physical-iPhone URLSession connectivity still needs the normal device check. The subsequent verification commit changes documentation only.
