# From contextual demo to a serious product experiment

Research review: 28 October 2026. These are recommendations, not newly agreed scope.
No application code was changed or external notebook executed for this review.

## What was actually reviewed

GitHub identifies `Chadzzy/MLDOT` as a fork of `frank-morales2020/MLxDL`.
Six local notebooks were inspected and their Git blob hashes matched upstream:
`DEEPSEEK_RECOVERAI_AGENT_PAXDEMO`, `AI_AGENT_PAXDEMO`,
`FULL_FlightDM_OPENAI_AGENT_DEMO`, `FLIGHTPLANAGENT_OPENAI_DEMO`,
`NAT_AOCC_DEMO` and `VL_JEPA_Flight_Intelligence_System`.
The review examined source and selected functions, not a successful end-to-end run.
Four flight-delay repositories were reviewed through their READMEs; relevant code
was additionally inspected in the Nive and FlightDelayAI repositories.
No prediction accuracy claim was independently reproduced.

## Frank Morales: useful ideas and their boundaries

| Source | What the inspected code does | What to borrow for this product |
| --- | --- | --- |
| [RecoverAI passenger recovery](https://github.com/frank-morales2020/MLxDL/blob/main/DEEPSEEK_RECOVERAI_AGENT_PAXDEMO.ipynb) | Searches a local `recoverai.db`; filters alternatives; scores departure-time difference, cost, directness, airline preference and connection time. Contains unfinished connection-query logic and a commented-out proactive disruption predictor. | Generate feasible recovery candidates, then rank against explicit passenger priorities. Replace departure-similarity scoring with arrival deadline, cabin preference, connection burden and rest opportunity. Keep ticket execution simulated. |
| [Full FlightDM](https://github.com/frank-morales2020/MLxDL/blob/main/FULL_FlightDM_OPENAI_AGENT_DEMO.ipynb) | Separates fleet, crew and passenger responsibilities over a hard-coded SQLite demonstration schedule. Alternative flights are literal placeholder strings; notifications/rebooking print messages. | Separate observation, impact assessment, candidate generation and passenger explanation. This architecture does not supply live operational data. |
| [NAT AOCC](https://github.com/frank-morales2020/MLxDL/blob/main/NAT_AOCC_DEMO.ipynb) | Typed workflow inputs, trace/latency hooks and cost evaluation. Weather, crew, maintenance, ATC and recovery results are generated using random choices. | Repeatable scenario experiments and decision traces. Use explicit seeds and configurable assumptions, rather than unrecorded randomness, when comparing designs. |
| [FlightPlanAgent](https://github.com/frank-morales2020/MLxDL/blob/main/FLIGHTPLANAGENT_OPENAI_DEMO.ipynb) | Hard-coded route/weather examples, a turbulence model trained from a local CSV, and an LLM prompt asking for a flight plan. | Limited direct relevance to passenger day-of-travel decisions. It does not establish a live flight-data connector or validated passenger-risk model. |

The main reuse is the separation of responsibilities and candidate scoring.
An agent-shaped class or a long generated explanation does not establish a working
forecast. We can implement these ideas as small testable functions in the existing
app/backend; adopting a multi-agent framework or replacing the UI is unnecessary.

## What the flight-delay repositories offer

- [nive927/Flight_Delay_Prediction](https://github.com/nive927/Flight_Delay_Prediction):
  two-stage classification and regression, with weather joins and class-imbalance
  handling. The stated problem is arrival-delay prediction **after departure**,
  using 2016–2017 data for 15 US airports. Its flight processing includes actual
  departure time and departure delay. Those can be valid after departure but are
  not available for our before-boarding decision. The README says the data files
  are private; its published metrics cannot be treated as reproduced HKG results.
  The inspected pipeline uses a random train/test split. We would need chronological
  validation and explicit prediction horizons for a live application.
- [HwaiTengTeoh/Flight-Delays-Prediction-Using-Machine-Learning-Approach](https://github.com/HwaiTengTeoh/Flight-Delays-Prediction-Using-Machine-Learning-Approach):
  useful discussion of imbalanced classification on 2018 US BTS/Kaggle data. Its
  README explicitly retains **actual elapsed time** as an important feature. This
  is unavailable before the flight completes; it cannot justify a pre-departure
  forecast. Feature availability at the intended decision time must be audited.
- [sichaohe/flight-delay-predict](https://github.com/sichaohe/flight-delay-predict):
  flight/weather joining and an application scaffold. Its README records a demo
  fallback to the same day's weather in earlier years when the forecast website
  failed. That is useful evidence about dependency fragility, not a current forecast.
- [Ganesh-403/FlightDelayAI](https://github.com/Ganesh-403/FlightDelayAI):
  interesting architecture for caching, updates, explanations and drift checks.
  However, [`scripts/generate_data.py`](https://github.com/Ganesh-403/FlightDelayAI/blob/main/scripts/generate_data.py)
  generates random flights, congestion and weather, then constructs delay from a
  simple formula plus randomness. That path supports a synthetic demonstration;
  it does not establish real-world predictive performance. No deployable HKG
  prediction capability was established by this inspection.

Useful methods: historical baselines, weather joins, imbalance handling, uncertainty
assessment, update caching and decision logging. A locally calibrated HKG model
would require historical observations/outcomes and evaluation at the time the advice
would have been given. Cancellation, departure delay, arrival delay and missed
connection are separate targets. Avoid silently dropping cancellations from an
experiment that claims to handle disruption.

## The central product hypothesis

A continually updated plan can help a passenger use more of their available time,
understand changes and recover with less effort, while respecting their constraints.
The product should answer: **“Given what matters to me and what we know now, what
should I do next—and when should that advice change?”**

[Flighty](https://flighty.com/) already advertises inbound-aircraft tracking, delay
predictions, ATC advisories, gate alerts, sharing and Live Activities. These are
vendor descriptions, not an independent performance assessment. They establish a
useful competitive baseline. Our strongest opportunity is the passenger-specific
plan spanning airport time, entitlement, connections, recovery, entertainment and
rest, with evidence that the plan improves decisions.

## What is missing in our current prototype

1. **One selected journey drives everything.** The real flight lookup currently
   sits alongside the fixed demonstration. Selecting a dated real flight should
   create the simulated booking and set the flight card, countdown, relevant
   weather, eligible lounges, recovery alternatives and media/rest timeline.
   Keep observed facts and injected events in separate layers. Existing designs
   remain the presentation specification.
2. **A shared model of passenger constraints.** Use synthetic profiles initially:
   arrival deadline, cabin preference, travelling companions, mobility/walking
   allowance, airside-only constraints, bag-reclaim assumption, lounge eligibility,
   desired meal/rest and tolerance for connections. Ask only for information that
   changes a recommendation. This can be demonstrated without ticket servicing.
3. **A planner that recalculates.** Filter infeasible activities and routes before
   ranking them. Use time windows, opening hours, eligibility, activity duration,
   location, queue assumptions and walking allowance. Current fixed allowances
   are a baseline; simulated queues and walking ranges can vary by scenario.
   The passenger can override a preference and see the plan update.
4. **Uncertainty changes the advice.** Store measured, reported, inferred,
   simulated and user-provided values distinctly. Forecast deterioration creates
   a watch state; confirmed flight changes create operational impact. Estimated
   boarding from STD remains a planning rule. Do not extend a leisure window merely
   because a delay is possible. Only show numeric confidence when calibrated;
   otherwise describe what is known and what remains uncertain.
5. **Continuous observation and selective intervention.** A backend scheduler,
   observation history and change detection are still missing. The current flight
   follower is foreground-only. Notify when the recommended action/deadline changes;
   repeated identical source responses should not create repeated alerts. Native
   push and ActivityKit can then carry that same recommendation to the lock screen.
6. **Evidence that the experience helps.** Instrument scenario version, decision
   time, available inputs, feasible options, recommendation, user choice and
   outcome. Compare against a simple status-and-alert experience. Measure correct
   next actions, decision time, usable airport time, unnecessary alerts, preference
   satisfaction and self-reported understanding/confidence. Simulation outcomes are
   not proof of real-world missed-connection reduction.

## Other sources worth deeper work

- [Google OR-Tools](https://developers.google.com/optimization): scheduling and
  constraint optimisation. A potential fit for choosing activities and recovery
  plans under time/eligibility constraints. Start with understandable rules and
  small candidate sets; add a solver only when the trade-offs justify it.
- [SimPy](https://simpy.readthedocs.io/en/latest/): discrete-event simulation with
  shared resources, real-time playback and event stepping. Useful for simulated
  security queues, lounge waits, boarding and connection cascades. This would be
  an experiment/test harness around our existing app, not a frontend rewrite.
- [Aviation Weather Center](https://aviationweather.gov/data/api/): VHHH METAR/TAF
  observations and forecast periods were verified in the preceding source review.
  Join weather by observation/issue time, not by future information retrospectively.
- [OpenSky](https://openskynetwork.github.io/opensky-api/rest.html) and the already
  tested ADSB.lol feed: candidates for inbound-aircraft context. Positions are not
  a schedule or rotation guarantee. Tail-to-operating-flight matching and aircraft
  swaps need explicit handling before using an inbound delay as evidence.
- [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels):
  extend the existing optional on-device preference interpretation. Translate
  “I need to be functional for a 9am meeting” into a reviewable preference/deadline,
  and explain the planner's known facts. Keep time arithmetic and eligibility in
  deterministic logic; retain the manual path.

Movies and music become more useful when fitted to the journey: a shortlist before
boarding, a film whose verified runtime fits a chosen window, and a rest preference
that survives recovery. Jet-lag triggers and evidence still need product discussion;
a timeline must not imply a validated circadian treatment algorithm.

## Proposed first serious experiment

Use one HKG–ZRH journey and three synthetic profiles: a passenger protecting an
arrival deadline, an eligible premium traveller prioritising rest, and a transit
traveller who must stay airside. Run the same normal, worsening-weather and
cancellation events for each. Profile differences must change the feasible options
and recommendations, rather than merely the greeting or artwork.

1. Connect the selected real flight to a simulated booking; keep manual scenario
   injection and accelerated playback.
2. Derive all timing from that journey. Add a small official HKIA directory, simple
   route nodes, explicit activity durations and simulated queue/walking ranges.
3. Recalculate the next action on meaningful changes; preserve saved media and
   recovery preferences. Render through the existing bottom sheet and modals.
4. Record observations and decisions for deterministic replay. Evaluate no-data,
   stale-data, contradictory updates, midnight, gate changes, disappearing delay
   estimates and overnight/airside constraints—not just a smooth happy path.
5. Run a small formative study, for example 12–20 travellers, with counterbalanced
   scenario order. This identifies usability problems and directional evidence;
   it is not a statistically powered proof of business impact.

A compelling demonstration would show the same live flight and cancellation
producing different, explainable plans for different travellers, with timing,
weather, lounge, entertainment and recovery adapting together. Booking and queue
execution can remain simulated throughout.

Research evidence is retained in `/workspace/research/day-of-travel/innovation-review/`.
