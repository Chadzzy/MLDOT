# Get ready for your journey

Working product specification, 28 October 2026 (Hong Kong). This records the next
iteration discussed with Lee. The first clickable design iteration is now implemented; see
[the design review and exact boundaries](PREPARATION-DESIGN.md). Preferences and
media selections work locally; IFE pairing, rides and fulfilment remain visual
mockups. This specification also describes further capabilities not yet built.

## Direction agreed in discussion

- Offer a resumable preparation module before, during or after check-in. It can be
  opened at any point; transport, comfort and enjoyment belong alongside documents.
- Ask progressively, reuse known booking information and make disclosure optional.
- Include airport transport, meal preferences, travelling with children, practical
  buggy arrangements and assistance needs that may be missing from a booking.
- Support an explicit “I’m exhausted—help me decide” choice for this journey.
- Explore entertainment preferences, Letterboxd and music recommendations tied to
  available content, flight timing and the passenger’s chosen rest intentions.
- Show an onboard continuation: scan a demonstration IFE screen and transfer the
  saved selections into its queue. Actual aircraft hardware/streaming is not connected.
- Explore an end-of-journey feedback prompt. A dedicated concierge/chat experience
  is deferred; its necessity has not been established.

Detailed wording, timing thresholds, jet-lag logic and partner integrations below
are proposals for testing, not settled airline policies or deployed capabilities.

## Interaction contract

Use the existing Cathay card, bottom-sheet and modal patterns. The preparation
module is an entry into the current journey, not a replacement homepage, new
navigation system or mandatory survey. Keep boarding-pass access throughout.

Ask one useful question at a time, with Skip, Not sure yet and Edit available.
Explain the benefit in the question's context. A passenger can complete transport
and leave entertainment for the lounge. Avoid a completion percentage that treats
optional taste preferences as mandatory travel requirements.

Each answer must produce a visible change: a leave-by plan, a transfer allowance,
a suitable airport suggestion or a revised onboard shortlist. Ask follow-ups only
where they change an action. Known booking information should appear as an editable
summary; a request should never be presented as confirmed fulfilment.

## Proposed preparation sequence

| Moment | Small question or review | Consequence in the journey |
| --- | --- | --- |
| Upcoming trip | What would make this journey work well for you? Arrive rested / keep it easy / enjoy the journey / arrive by a commitment | Set an explicit trip priority; reuse it during disruption |
| Getting there | How do you plan to reach the airport? Train / car or taxi / being dropped off / undecided | Build the leave-by plan; offer an appropriate transport handoff |
| Food | Review meal information already supplied; ask about preferences if useful | Distinguish requested onboard meal from confirmed availability; consider terminal food and timing |
| Family | Confirm children already on the booking; optionally ask about a buggy or useful facilities | Add realistic buffers and relevant terminal guidance |
| Assistance | Review existing assistance; offer a way to request support if missing | Separate requested and confirmed support; adapt the route and timing assumptions |
| Rest | Would you like help planning rest around your arrival? | Offer an editable destination-time plan; agree actual jet-lag rules separately |
| Entertainment | What would you enjoy? Pick favourites, import preferences or choose manually | Match tastes to the available demonstration catalogue and chosen awake time |

“Make this easy for me” offers a small proposed plan with a clear accept/edit action.
It does not infer exhaustion or health needs. Assistance questions focus on the
support required, without asking for a diagnosis. Keep these choices scoped to
this trip unless the passenger explicitly asks to remember suitable preferences.

## Family and assistance details that make the context useful

A buggy creates practical questions: where it may be used, what happens at
security, where it is handed over and where it is returned. These vary by station,
operator and arrangement. Use verified local guidance or label the scenario's
assumptions; do not invent a universal gate-return policy. A child’s age alone
should not select the family’s needs or preferences.

For assistance, show the actual status of a request. Adjust walking/transfer
allowances when appropriate and explain remaining confirmation needs. An
estimated airport route is not a verified accessible route. If a facility or
procedure is unknown, offer a useful way to check it rather than a false promise.

## Entertainment, rest and the onboard handoff

The recommendation has two filters: (1) what the passenger might enjoy, and
(2) what is available and fits the intended viewing/listening time. Watchlist,
ratings, favourites and “already seen” are distinct signals. A watchlist entry
is not automatically a liked film, and the passenger may want a rewatch.

A proposed first Letterboxd path is a passenger-supplied export or manually chosen
favourites. Direct account connection needs verified supported API access. Checks
of https://api-docs.letterboxd.com/, https://letterboxd.com/api-beta/ and
https://letterboxd.com/about/faq/ returned HTTP 403 from this environment on
28 October 2026; no API integration or current export schema was verified. No
private profile was accessed and no source denial was bypassed.

Matching should use stable film IDs where available, then title/year with explicit
ambiguous-match handling. Recommend from the selected catalogue snapshot, with
reasons such as a liked director, language preference and runtime. Monthly
editorial titles do not prove availability on a particular aircraft. Our current
sourced titles have incomplete runtimes/languages; leave those unknown until
verified or explicitly supply separate scenario values.

For music, curate a playlist from permitted metadata and chosen tastes. Saving
track references is not downloading audio or connecting a streaming subscription.
An optional destination-time/rest plan can influence selection duration; it must
remain editable and cannot imply a validated jet-lag prescription. A delayed
flight should trigger a review of the plan, not silently discard saved selections.

Proposed demonstration handoff:

1. The passenger saves films/music to the journey before boarding.
2. After boarding, an example seatback screen shows a pairing QR and a manual-code
   alternative. The phone confirms the intended demonstration screen.
3. A short-lived, single-use pairing token links that screen to the selection
   session. Transfer title/track identifiers and ordering, not passenger identity
   or media files. Display progress only while a real prototype handshake runs.
4. The example IFE screen acknowledges the queue; only then show “Your selections
   are ready on this screen.” Keep unavailable titles visible with alternatives.
5. Rebooking or a changed catalogue preserves preferences, reconciles unavailable
   titles, and requires fresh pairing to the replacement screen.

This could be a functioning phone-to-browser prototype using our backend. It would
show the proposed airline experience without claiming aircraft IFE integration,
content downloads or actual seat association. Pairing is a separate implementation
increment; it is not present in the current decision-inspector relay.

## Flight, passenger and pickup readiness

Keep three observable strands rather than an unexplained readiness percentage:

- Flight: schedule, gate, status, confirmed aircraft assignment, last observed
  aircraft position and any reported inbound estimate. Unknown crew, maintenance,
  catering and bag-loading status stay unknown unless explicitly simulated.
- Passenger: chosen transport, estimated airport arrival, chosen/confirmed
  assistance, transfer needs and boarding-time budget. Clearly distinguish what
  they told us from a measurement or planning assumption.
- Onboard plan: meal preference, entertainment saved, rest intention and pairing
  status. These improve comfort and are not conditions for being allowed to fly.

The existing shared planner connects relevant changes to the next action. The
inspector explains which recorded fact or assumption caused a change, excluding
personal free text and assistance details from its public demo trace.

For ride planning, distinguish departure-airport transport from destination pickup.
Touchdown is not pickup readiness: bags, border checks, exit time and passenger
confirmation matter. Start with a proposed pickup plan and supported handoff link;
verify Uber link parameters/capabilities before implementation. Queues may remain
simulation inputs. No automatic paid booking or driver-dispatch claim is needed.

## Feedback and experiment

Offer one optional question after the journey, at a suitable moment: “Did this
help you feel prepared?” A negative or neutral answer can reveal one short
follow-up: “What was missing?” An optional end-of-trip summary can let the user
identify an actually useful intervention or an interruption they disliked.

Distinguish operational trip quality from product usefulness: a cancelled flight
can still have well-handled support. Combine feedback with time to make a choice,
accepted/overridden suggestions, unnecessary interruptions, recovery preference
fit and selection continuity. Never treat an ignored prompt as dissatisfaction or
an absent feedback response as consent to store more preferences.

## Proposed next demonstration

Primary story: HKG–Zurich, arriving rested. Preparation → airport transport →
eligible lounge/food → saved entertainment and editable rest intention → boarding
→ demonstration IFE pairing → arrival/pickup → feedback. Repeat with a weather
warning, confirmed delay and recovery to show which choices survive and what changes.

A second, smaller family/assistance branch can prove that the same modules adapt
without proliferating screens. Build the progressive preparation and its actual
planner consequences first; add the pairing demonstration as a focused subsequent
increment. Keep the existing exact UI assets and modules as the design contract.
