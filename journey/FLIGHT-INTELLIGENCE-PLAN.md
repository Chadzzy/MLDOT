# Building our flight intelligence

Agreed direction, 28 October 2026. The existing passenger UI remains the design
specification. The first implemented increment is the shared planner and
[decision inspector](DECISION-INSPECTOR.md). The features below need further work;
there is no trained HKG delay model or aircraft map in the app yet.

## 1. Reuse Frank's ideas for repeatable simulations

Borrow the separation of observation, disruption impact, feasible alternatives,
priority ranking and decision trace from Frank Morales's demonstrations. Keep
recovery execution simulated. Specify scenario versions and explicit event
sequences; if adding randomness, record the seed. That allows the same journey
to be rerun under different passenger priorities and policies.

Do not run the notebooks unchanged as production services: inspected sources
include private/local SQLite paths, fixed alternatives, random operational facts
and incomplete queries. Our implementation uses small deterministic functions in
this codebase. The [source review](INNOVATION-REVIEW.md) records what was actually
inspected, including links and limits; no copied notebook model was executed.

## 2. Build our own model using Nive's approach

Nive's useful pattern is classification (will it be delayed?) followed by a
conditional delay-duration model. Its model predicts arrival after departure,
uses US data and actual departure delay, and its dataset is not supplied. We need
a different training dataset and different pre-departure features for HKG.

### Start with observable history

Record immutable snapshots with a dated identity: operating flight number, origin,
destination and scheduled departure UTC. Also retain local dates and UTC offsets.
Capture source update time, retrieval time, schedule, reported estimates, actual
departure/arrival and cancellation. Keep deduplicated provider observations separate
from injected scenario events. Store when each fact became available, not only its
final value. Missing polling periods are unknown coverage, not on-time flights.

A first history card can show “12 of the last 40 comparable departures left at least
15 minutes late,” with its date range, sample size, missing records and cancellation
count. That sentence is illustrative, not a measured result. Exclude cancellations
from the flown-departure denominator explicitly and show them separately. Use a
confidence interval and avoid implying a tiny sample establishes a precise rate.
Historical frequency is not the probability of delay on today's departure.

### Train only on what was knowable at prediction time

Choose targets separately: departure delay >=15 minutes, arrival delay, cancellation
and missed connection. Start with the first. Freeze features at T−6h, T−2h and
T−45min: scheduled time/day/season, recent route/airport outcomes available then,
weather forecasts issued by then, current observations and confirmed inbound
rotation status. A forecast's later revision must not leak into an earlier example.
Actual departure delay is unavailable before departure; actual elapsed flight time
is unavailable until completion. Never include these as pre-departure predictors.

Use an expanding chronological training/validation/test split, with each flight
identity confined to one split. Compare a historical-rate baseline with logistic
regression and gradient-boosted trees before adopting complex models. Fit any
imputation, class balancing and probability calibration on training/validation
only. Report Brier score, calibration by probability bucket, precision/recall,
false alerts per journey and useful warning lead time. Evaluate separately by
route and time horizon, including missing inbound/weather data. A duration model
can follow with prediction intervals rather than a falsely exact revised time.

The free public status search is useful now but does not establish a durable
historical archive or bulk-data entitlement. Start our own modest observation
store and evaluate suitable licensed archives if we need more history sooner.
US BTS data can exercise a pipeline; it cannot validate HKG predictions.

## 3. Where is the aircraft that will operate my flight?

A workable chain is flight instance → reported airframe assignment → registration
or ICAO hex → fresh ADS-B position → confirmed previous flight/arrival estimate.
Recheck the assignment to detect aircraft swaps. Callsign similarity alone is not
proof of the assigned airframe or inbound rotation. Missing coverage is “position
unavailable,” not proof the aircraft is parked, airborne or delayed.

[ADSB.lol](https://www.adsb.lol/docs/open-data/api/) provides a free documented
registration lookup. A standard request to `/v2/reg/B-5961` returned HTTP 200 and
one position with registration, callsign and position age during this work. This
proves aircraft lookup, not association with our Cathay demonstration flight. An
HKG area request had also returned live aircraft. Its ODbL attribution applies.
The public service offers no assumed operational SLA and requires native/backend
transport in our current browser setup.

Cathay's public status response contains an aircraft code; establish and validate
its registration meaning and dated assignment before claiming “your aircraft.”
Prefer “last reported position” with observation age until the relationship is
confirmed. To estimate a knock-on delay, we also need inbound destination/ETA and
an explicit, testable turnaround allowance. ADS-B alone supplies neither airline
maintenance/crew readiness nor a guaranteed next-flight assignment.

## 4. Turn intelligence into useful decisions

A delay probability should not automatically extend the lounge window. The
planner still respects the current boarding deadline. It can flag uncertainty,
reduce commitment to timed activities, explain the reason and prepare recovery
choices. The inspector should show the model version/horizon, source freshness,
prediction and recorded rule outcome, without pretending a statistical prediction
is an operational confirmation.

The next engineering sequence is: dated live-flight selection drives the existing
journey; persistent observation capture and change detection; verified airframe
assignment/position; historical performance card; calibrated forecasting once the
history supports it. Backend scheduling needs deployment authority beyond the
public project key. No scheduler or archive has been deployed by the inspector work.
