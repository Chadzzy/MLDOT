# Integration verification — 26 October 2026

## Connected in the browser

| Connection          | Official resource                                                                                     | Verified result                                                                | Meaning / boundary                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Airport temperature | [HKO Current Weather Report](https://data.gov.hk/en-data/dataset/hk-hko-rss-current-weather-report)   | HTTP 200; JSON; `Access-Control-Allow-Origin: *`; Chek Lap Kok station present | Observed temperature, with station observation time and report publication time. Not a flight-date forecast.                                       |
| Hong Kong warnings  | [HKO Weather Warning Summary](https://data.gov.hk/en-data/dataset/hk-hko-rss-weather-warning-summary) | HTTP 200; JSON; CORS `*`; empty warning object in initial response             | Empty is a valid response with no active warnings returned; failures are not treated as an all-clear. Cancelled/expired warnings are excluded.     |
| Airport Express     | [MTR train information](https://data.gov.hk/en-data/dataset/mtr-data2-nexttrain-data)                 | HTTP 200; JSON; CORS `*`; AEL-HOK schedule returned                            | Up to four valid train predictions at Hong Kong station, direction/destination and platform. No door-to-airport travel-time or ticket integration. |

These are three public read-only GET requests, without an API key, cookies or traveller information. They run when the user opens **Call live integrations** or requests live weather. No background network polling runs. Manual refresh is limited to one batch per 30 seconds. A 10-second UI timer updates freshness labels only.

The source inspector displays URL, HTTP status, duration, retrieval time, observation time and normalized returned fields. A successful HTTP response must also pass schema/station validation. Weather is stale after two hours, train observations after 90 seconds, and the fetched warning summary after five minutes. Clock mismatch is labelled. These are prototype display thresholds, not provider guarantees.

The weather modal adds current airport conditions separately from the sample journey forecast. Live weather never establishes a flight delay, maintenance cause or new boarding cutoff. Scenario overlays do not change real source observations.

Sources and intellectual-property owners are attributed in the UI with links to DATA.GOV.HK and its [terms](https://data.gov.hk/en/terms-and-conditions). The HKO website also has its own [materials-use conditions](https://www.hko.gov.hk/en/readme/readme.htm); do not generalize open dataset access into a licence for HKO imagery, maps or other website materials.

## Curated Cathay information

Six official lounge pages and the current public admittance page were read and verified. Five lounges are currently listed; **Wing Business is explicitly closed**. Records include official URLs, verification date, floor/gate references and published hours. Wing First has temporary access restrictions, Pier Business has facility closures, and Bridge's private retreat has narrower rules than the general lounge.

This is a curated directory, not a live lounge API. Real-time opening, queues, occupancy and admission are unknown. Coordinates/indoor routing remain absent. No photographs were copied. A limited eligibility demonstration assumes a known same-day Cathay-operated departure, paid cabin, no guests, no complimentary upgrades and no connecting-cabin override. Unknown travel facts return needs-confirmation. Venue closure overrides an otherwise matching profile. No purchase flow exists.

## Tested but not connected

- **HKIA flight feed:** official [DATA.GOV.HK dataset](https://data.gov.hk/en-data/dataset/aahk-team1-flight-info) describes historical flight schedules, updated daily through the previous calendar day. Its documented endpoint and the public flight page returned HTTP 403. It cannot be called a verified live flight-status source.
- **HKIA dining/shopping:** official directories returned HTTP 403. No invented restaurant/shop records were added.
- **Aviation Weather Center:** `https://aviationweather.gov/api/data/metar?ids=VHHH&format=json` returned a genuine VHHH METAR, HTTP 200. The response had no browser CORS permission, so it is not connected in the static preview. A supported backend would be needed for that route.
- **Timatic/Sherpa, flight aggregators, media accounts, booking and native Live Activities:** no account-backed integration was attempted or activated. No provider credentials are configured. Existing readiness, entertainment and native-activity screens retain their stated prototype boundaries.

## Validation

19 Node tests cover journey logic, response validation, Hong Kong midnight conversion, warning cancellation/expiry, staleness, partial failure and lounge closure/unknown inputs. Nine core browser checks pass. `tests/live_browser.py` exercises three genuine public responses, their integration into the weather/lounges UI, and a separately simulated outage.

Chromium's local trust store lacks the managed proxy CA. Browser verification therefore obtains real HTTPS responses using urllib's configured platform CA/proxy path and renders those responses in Chromium; response CORS headers are retained. TLS verification is never disabled. The test records this transport limitation explicitly and does not claim an unmodified browser networking test inside the managed environment.

Raw source-check evidence stays in `/workspace/research/day-of-travel/integration-probes/` and `verified-venues-2026-10-26.*`. No denied endpoint was bypassed.
