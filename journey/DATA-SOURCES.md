# Flight, airport and entertainment data review

Reviewed 28 October 2026. This is a source assessment, not a claim that the providers below are integrated. Existing app connections include HKO temperature, HKO warnings and MTR Airport Express. A subsequent successful Cathay public-site flight lookup is now implemented; see the update below. Warning monitoring runs in the foreground only. Supabase persists demonstration journeys; no scheduled flight-monitoring worker is deployed.

## Resolved since the initial review

The user's clarified scope is simulation: ticket servicing and real queues are not
requirements. The normal Cathay passenger flight search returned real HKG flight
status, times, terminal and gate without a third-party account or key. A working
lookup, fixed native adapter and foreground monitoring are now implemented.
See [the flight integration and test evidence](LIVE-FLIGHTS.md). AeroDataBox/Cirium
remain fallback candidates, not prerequisites. Provider trials and comparison use
must follow their actual terms; FlightStats' free website is not a reusable data feed.

The initial gap assessment below describes production evidence needs, not blockers
for the simulation. Boarding may be derived from STD using the agreed demo rules.

## Initial source assessment

| Passenger feature | Missing evidence | Practical route |
| --- | --- | --- |
| Follow a real flight | Dated operating flight identity, scheduled/estimated/actual times, status, terminal and gate | Trial an aggregator against actual HKG departures and connections. Gates and other fields can be absent even when a flight exists. Resolve codeshares and local service dates. |
| Boarding countdown / time for the lounge | Actual boarding start, gate-close deadline, current passenger position and reliable walking allowance | Airline booking/boarding data plus airport routing. Departure time is not boarding time; keep fallback planning assumptions explicit. |
| Explain disruption / aircraft readiness | Confirmed delay cause, maintenance clearance, crew readiness, bag loading, aircraft rotation | Airline/airport operational sources. Some aggregators have selected cause/rotation fields, but coverage must be tested. Weather alone cannot establish the cause of a particular delay. |
| Worsening weather | Airport observations and forecast periods, alongside HKO warnings | Free VHHH METAR and TAF calls verified; adapter still needed. Keep weather severity separate from confirmed flight impact. |
| Dining, shops and lounges | Official location, floor, airside/landside, opening hours, access conditions, current closures | Curated official directory first. Existing Cathay lounge records are curated; dining/shop data remains incomplete. |
| Reliable connection navigation | Transfer-security queues, transit/immigration constraints, accessible routes, indoor position and minimum connection rules | Airport/airline data and a validated route graph. No verified public feed for these in this review. A gate map alone does not establish a safe connection time. |
| Lounge treatment / availability | Entitlement, occupancy, appointment slots | Cathay rules can inform eligibility with a known traveller profile. Live capacity and reservations require operational integration. No lounge purchase flow. |
| Recovery that actually books | Seat/cabin inventory, ticket rules, servicing authority, PNR, hotel and transport confirmation | Airline/distribution/servicing partners. Public flight status cannot reissue a ticket or guarantee a Business seat. |
| Documents | Passport, residence, destination and transit rules for the traveller | Timatic or another authorised requirements provider; a checklist is not travel clearance. Not newly tested in this review. |
| Entertainment shortlist | Current Cathay titles, runtimes, language/subtitle options and aircraft-specific availability | Official monthly guide is readable. Six factual title records saved alongside this report; catalogue automation and flight-specific inventory remain unverified. |

## Flight providers worth testing

**AeroDataBox — first candidate.** [API](https://aerodatabox.com/api), [pricing](https://aerodatabox.com/pricing), [coverage](https://aerodatabox.com/data-coverage). Official coverage table, last updated June 2026, reports 100% Hong Kong schedule and status/time coverage, but explicitly calls this approximate and not guaranteed. That is a reason to test, not a completeness claim. Its documentation says gates are only sometimes available and departure/arrival coverage may differ. RapidAPI Basic lists 400 API units; API.Market offers a seven-day Basic trial. Units are not requests: endpoint costs differ. Paid marketplace plans start around US$8/month; commercial use requires a paid plan under the current terms. No key configured and no authenticated flight response tested.

**Cirium — comparison candidate.** [FlightStats developer portal](https://developer.flightstats.com/) directs new integrations and free trials to [Cirium Developer Studio](https://developer.cirium.com/) / Sky API. Flight status, schedules, connections and alerts are relevant. Trial credentials, limits, commercial terms and actual HKG field coverage need checking. No authenticated call tested.

**FlightAware AeroAPI — potentially useful, but budget matters.** [Official plans](https://www.flightaware.com/commercial/aeroapi/) list personal usage credits separately from business plans. Standard has a US$100 monthly minimum at review time. Do not assume personal free usage covers the company prototype. No authenticated call tested.

**aviationstack — easy to explore, restrictive free quota.** [Pricing](https://aviationstack.com/pricing) lists 100 monthly requests for the noncommercial free plan. Too small for persistent monitoring: one flight checked every five minutes for 12 hours already takes 144 requests. Paid Basic is listed at US$49.99 monthly. HKG fields and latency remain unverified.

**OpenSky is a supplement, not the flight-status authority.** [API documentation](https://openskynetwork.github.io/opensky-api/rest.html) exposes ADS-B positions/state vectors and flight-history information. Useful for an aircraft map; not a replacement for gates, boarding deadlines, cancellations, tickets or operational reasons.

### If a licensed provider trial becomes necessary

Use a small dated sample: a Cathay HKG departure, an arrival connecting through HKG, and an alternative itinerary. Record provider, operating/marketing flight, airport, local service date, UTC and local times, gate/terminal, status, source update time and retrieval time. Preserve unknown fields. Validate against official flight information where the relevant terms permit; the free FlightStats terms restrict benchmarking and redistribution. Measure missing fields, actual update latency, request cost and codeshare matching before selecting a provider. Do not wait for a real cancellation: replay a recorded provider-shaped fixture as a separate simulation, without changing live observations.

Poll centrally per flight, not per user; share cached observations. Adjust intervals to flight phase and provider limits. Deduplicate changes and separate provider updates from injected scenarios. Background checks, APNs and ActivityKit are implementation work in addition to acquiring the data.

## Free sources actually probed

- **Aviation Weather Center:** [API documentation](https://aviationweather.gov/data/api/). GET `https://aviationweather.gov/api/data/metar?ids=VHHH&format=json` and `https://aviationweather.gov/api/data/taf?ids=VHHH&format=json` both returned HTTP 200 and one genuine airport record. METAR includes observation time, wind, visibility and cloud. TAF includes issue/validity times and forecast periods. Neither response supplied browser CORS permission in this test; use a supported native/backend adapter. These responses are verified but not integrated. Fetch in line with source update cadence and documented limits.
- **HKIA:** the [official open dataset](https://data.gov.hk/en-data/dataset/aahk-team1-flight-info) is historical flight information, not a verified live feed. Its documented endpoint again returned HTTP 403. Official dining and map pages also returned 403 from this environment. This does not establish that HKIA has no partner API; it means this access path is unavailable here. No denied endpoint was bypassed.
- **OurAirports:** [public downloads](https://ourairports.com/data/) provide useful airport/runway reference data. They do not supply indoor POIs or live airport operations.
- **Google Places:** [official API](https://developers.google.com/maps/documentation/places/web-service/overview) is a candidate for venue names, locations, hours and photos with credentials/billing and applicable storage terms. Not verified in this prototype and not an indoor airside routing solution.
- **OpenStreetMap:** a public Overpass restaurant/cafe query returned HTTP 406; no venue dataset was obtained in this review. Crowdsourced geometry, if available, still needs validation for floors, security boundaries and accessible walking routes.

## Movies: use real Cathay titles first

The [official entertainment landing page](https://flights.cathaypacific.com/en_HK/flying-with-us/inflight-entertainment.html) links to [the Cathay catalogue](https://entertainment.cathaypacific.com/) and the [October 2026 guide](https://www.cathaypacific.com/cx/en_HK/inspiration/cathay-stories/cathay-pacific-inflight-entertainment-2026.html). The guide was read successfully. The catalogue shell returned HTTP 200, but a browser probe did not expose playable title inventory; only translation JSON was captured. No catalogue API is verified.

`data/cathay-entertainment-2026-10.json` contains six real titles and categories from that official guide, with source date and URL. Runtime, languages, images and flight availability are deliberately unknown. This is an editorial selection for one month, not the complete catalogue or a promise of availability on the demonstration flight. Do not automatically join remakes or identically named films by title alone.

A useful experience: browse Cathay picks, save a shortlist, later filter by verified runtime/language, and preserve the choice after disruption. Once runtimes and journey timing are known, show how a film fits into the passenger's chosen meal/rest plan. Saving a film does not transfer it to the seatback or grant streaming/download rights.

[TMDB](https://developer.themoviedb.org/docs/faq) can enrich verified title matches with metadata and images. Its free API is for noncommercial use with attribution; commercial licensing is separate. It cannot confirm Cathay availability or supply full-film playback rights. No TMDB key was configured. No posters or protected editorial copy were copied into the curated dataset.

## Initial recommendations, superseded by the working Cathay lookup

1. Test AeroDataBox and, if trial access is available, Cirium against the same HKG flights; choose based on returned fields and freshness.
2. Add the already verified METAR/TAF data to the existing weather context, keeping flight impact separately sourced.
3. Add a backend monitoring worker and then native notifications/Live Activities; the current foreground monitor is not background checking.
4. Use the sourced Cathay movie records for the shortlist, enrich verified matches when needed, and continue the official airport venue directory.

Evidence: source pages, JSON probes and retrieval results are retained in `/workspace/research/day-of-travel/source-review/`. This report adds no paid service, credentials, background deployment or UI changes.
