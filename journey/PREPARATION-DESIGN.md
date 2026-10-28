# Preparation design review

28 October 2026, Hong Kong. Eleven clickable screens have been added to the existing
journey implementation using its fixed iPhone frame, modal shell, GT Walsheim
fonts, colours, original brand assets and official Pier lounge photograph. This is
a design prototype; partner integrations are not represented as connected.

## Open and review

Open the [published preparation walkthrough](https://htmlpreview.github.io/?https://raw.githubusercontent.com/Chadzzy/MLDOT/12951637c746aff5bc67a1ae50deaaba5616f55d/ios/JourneyApp/Resources/journey.html#prepare). In the sidebar, choose
**New · Make the journey yours** to step through the design story, or select any
screen under **New · Your journey, your way**. The homepage and expanded journey
sheet also contain **Get ready for your journey**. The same entry is bundled for
the iPhone host; a new ZIP is not needed when using the existing Mac checkout.

Screens: preparation overview; journey priority; transport; family/support; meals;
rest intention; entertainment; onboard pairing preview; arrival/pickup preview;
feedback; and a combined readiness view.

A [four-screen design board](https://raw.githubusercontent.com/Chadzzy/MLDOT/12951637c746aff5bc67a1ae50deaaba5616f55d/journey/public/reviews/preparation-design-board.png) is also published.
It is composed of screenshots of the actual implementation, using its original
font/assets. Entertainment thumbnails are abstract category artwork, not fabricated
film posters. The exact night-time homepage photograph remains the previously
recorded asset gap; no replacement was introduced in this work.

## Working interactions

- Optional choices are saved locally in the existing journey state. Back, skip,
  edit and reload work. Family questions reveal the buggy detail when relevant.
- Transport changes the existing next-action text. Easy/rest intent changes the
  airport lounge suggestion when time and scenario conditions permit. Weather,
  cancellation and boarding urgency still take precedence.
- The new entertainment presentation reuses the existing saved IDs and example
  catalogue. Mood changes order; selections survive disruptions and appear in the
  paired-screen mockup. It is not the flight-specific real Cathay catalogue.
- A replacement itinerary updates displayed arrival times. Lounge access is flagged
  for review after cancellation/recovery. New native journey identities clear
  trip-specific preparation/support/feedback; saved entertainment is retained.
- Feedback is editable and stored locally. No analytics submission occurs.
- The boarding-pass shortcut, current modal focus handling, transitions and reduced
  motion support are retained. No stand-by or concierge feature was added.

## Explicit mockup boundaries

The IFE code and paired-screen state are visual examples. No camera scan, backend
pairing, real screen acknowledgement, aircraft seat binding or content transfer
occurs. The customer action is **View my selections**; its result shows saved selections,
with seatback connection still pending. Technical simulation explanations stay in
this document and the presenter controls, rather than the passenger copy.

Letterboxd account access, Uber booking, meal orders and assistance requests are
not connected. Family/support and meal selections are preferences, not confirmed
requests. Journey times from Central are illustrative transport allowances. Rest
choices are editable intentions; no medical or jet-lag model is implied. The
arrival preview does not advance the actual simulation clock.

Only intent and transport currently affect the shared planner. Additional family
transfer allowances, meal scheduling and validated sleep windows need their own
rules and source work. The inspector excludes support details and feedback text.

## Verification

43 JavaScript tests cover the existing model and new preparation validation,
persistence, new-trip reset, urgency precedence and trace privacy. Browser checks
exercise all new screens, optional branches, saved media, local pairing/ride
mockups, feedback, reload, cancellation, original font, pass access and overflow.
Existing native-host and sheet geometry checks are also run against the new bundle.
The updated bundle compiled with Xcode 26.3 and all eight simulator tests passed
for source `1295163` ([CI evidence](https://github.com/Chadzzy/MLDOT/actions/runs/40687206162)).
The published HTML Preview page opened, rendered the new flow and saved a choice
without page errors; the published design-board image matches the reviewed file.
Physical-device verification is not inferred from Chromium or simulator unit tests.

## Passenger copy · 28 October 2026

Removed demo/simulation, sample and mockup labels throughout the passenger journey,
including preparation, weather, boarding passes, recovery, sharing and arrival.
Estimated times and pending confirmations remain explicit. The customer-copy
audit covered all 30 passenger routes; presenter controls and the decision inspector
retain source/provenance explanations. The original components and interactions
remain in use.
