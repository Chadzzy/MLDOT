# Contextual journey — working agreement

Last updated: 28 October 2026. This is the living instruction file for people and
coding agents working on the project. Read it before editing. Update the relevant
section when a decision changes; do not let obsolete instructions accumulate.

## 1. Put the passenger experience first

UI fidelity, useful behaviour and interaction quality are the highest product
priorities. Technical convenience must not dictate the experience. Accurate
information and honest state handling are part of that quality.

- Treat the user's selected homepage, persistent bottom sheet, boarding pass and
  weather modal as specifications to reproduce, not inspiration for a new design.
- Preserve the existing Cathay module patterns, typography, spacing, colour,
  imagery and hierarchy. Secondary screens may adapt within that system.
- Keep the persistent journey sheet central: collapsed, partially open and fully
  open, with boarding-pass access throughout the journey.
- Match the original boarding-pass layout and actual brand artwork. Keep flight,
  passenger, seat, gate and time values consistent across every surface.
- Keep the homepage mostly static. Recent searches and decorative header elements
  do not need interactions. Do not reintroduce standby or upgrade-list features.
- The browser walkthrough uses the established proportionally scaled iPhone
  mockup. The real iPhone app must use its actual screen and safe areas, without
  a fake phone frame, fake status bar or external presenter navigation.
- Account for scrolling, long copy, loading, errors, empty states, keyboard focus,
  touch targets, accessibility and reduced motion. These are designed states.

## 2. Change the existing implementation; do not restart it

- Inspect the current code, references and working flow before editing.
- Make focused changes to the existing components and shared model. Do not rewrite
  the app, switch frameworks or regenerate entire screens for a small request.
- Refactor when it is necessary to support the requested behaviour. Keep the
  scope deliberate, explain the reason, and preserve established interactions.
- Reuse shared modules and design tokens. Fix the common source of a visual or
  state inconsistency instead of copying a one-off patch into every screen.
- Do not create a second competing journey model, hardcode contradictory values
  in separate views, or let native and server clocks compete for authority.
- Preserve user choices through normal navigation and disruptions. Clear only
  what a reset or a new journey is explicitly meant to clear.
- Never overwrite unrelated work, force-push over changes, or merge to `main`
  simply to deliver a prototype update. Inspect the current branch first.

## 3. Work in build–review–refine loops

“Use loops” means a deliberate feedback cycle, not repeated blind regeneration.

1. **Inspect:** read the request and relevant originals; identify the existing
   module, journey state and observable acceptance criteria.
2. **Implement:** make the smallest coherent change that completes the intended
   behaviour, including its loading and failure states.
3. **Run:** build the affected target and exercise the interaction. Use focused
   tests where state, persistence, time or integration behaviour could regress.
4. **Look:** inspect rendered screenshots beside the original reference at the
   intended size. Check fonts, image loading, spacing, clipping and scroll ends.
5. **Use:** walk into the screen from the previous step, interact with it, go back,
   reopen it and check the next step. For motion, observe the transition or a
   recording; a still screenshot cannot prove that a gesture feels right.
6. **Refine:** correct observed defects and recheck the affected flow. Stop once
   acceptance criteria pass; do not keep redesigning or retesting without cause.
7. **Deliver:** for native source changes, run the GitHub Xcode build and simulator
   tests before handoff; if unavailable, state the blocker. Then package the actual latest build, verify the published link or
   artifact, and report what was verified and what still needs another device.

For a change to shared modules or journey rules, check both normal travel and the
delay/cancellation/recovery branch. A successful compilation alone is not a UI
review. If a required check cannot run, record it as unverified rather than passed.

## 4. Use original assets; generate imagery where it adds value

- Use the supplied `screens.zip`, supplied GT Walsheim font and documented official
  Cathay assets first. See [asset provenance](journey/ASSETS.md) and
  [source records](journey/src/assets/sources.json).
- Never invent or redraw Cathay logos, substitute arbitrary fonts, or replace an
  exact supplied screen with an AI interpretation. Do not synthesize font weights
  when the correct supplied/published weight exists.
- Exact artwork regions from supplied screenshots may be reused for static
  elements. Keep changing journey data as real UI; do not turn an interactive
  screen into a screenshot with misleading hotspots.
- Generate imagery when an approved module genuinely needs original decorative
  or editorial artwork and no suitable supplied or official image exists. Use the
  available image-generation tool, a deliberate brief and the established style.
- Do not generate fake venue photographs, official maps, operational evidence,
  brand marks or photos presented as the real HKIA/Cathay location. Decorative
  generated imagery must not imply a real facility, product or entitlement.
- Record image source/generation provenance and intended use. Inspect composition,
  crop, legibility and loading in the actual module; embed or bundle assets so they
  do not disappear when a temporary image URL expires.
- Do not invent a replacement for a specifically requested original that is
  missing. State the remaining gap and keep an explicitly provisional asset.
  Avoid adding new decorative imagery to screens that already match the reference.

## 5. Make interactions feel considered

- The journey sheet must follow the finger continuously and settle at its snap
  positions. Keep scrolling and dragging from fighting each other.
- Preserve the established modal transitions, focus handling, close behaviour
  and nested boarding-pass access. Avoid sudden mounting, jumps and layout shifts.
- Show loading or thinking feedback for actual work. Do not claim an AI or API
  call occurred because an artificial timer ran. Demonstration timing belongs in
  the simulation controls and must remain identifiable as simulation.
- Keep actions responsive; prevent duplicate submissions and preserve entered
  preferences when something fails. Honour reduced-motion settings.

## 6. Keep the agreed product boundaries

- Anchor the experience on Hong Kong departures and connections, starting with
  the HKG–Zurich demonstration. Support normal travel and recovery coherently.
- Start with a demonstration booking. Provide guided, accelerated and real-time
  playback, phase jumps and injected changes inside the app's menu/settings.
  A separate presenter panel is deferred. Keep the existing browser walkthrough
  available for review without making it the passenger's control surface.
- Real-time **simulation** is not a live flight. Real-flight following requires a
  dated flight identity and an actual provider connection.
- Cathay lounges only. Show included experiences because the traveller is
  eligible; no lounge purchases and no redundant eligibility-check button.
  Re-evaluate eligibility when the underlying itinerary changes.
- Retain the entertainment selection flow. Saving a film or playlist is not a
  claim that streaming, downloading or aircraft playback is integrated.
- Jet-lag triggers still need product discussion. Do not invent a personalised
  medical/sleep prescription or imply a validated jet-lag algorithm exists.
- Travel-document checklists are not Timatic clearance. Booking, ticketing, hotel,
  bag handling, treatment availability and navigation require their own evidence.

## 7. Keep data, simulation and AI honest

- Use Supabase for this prototype backend, with its migrations and client code
  in this repository. The selected project is `mekjqboywhbtbbabxela`. This is our
  prototype service, not an existing airline/company backend. Do not invent
  deployed capabilities or credentials. See [backend setup](backend/README.md)
  and [the integration boundary](ios/BACKEND-CONTRACT.md).
- Persistent monitoring belongs on the backend. Local playback can resume from
  a saved clock; that does not mean iOS kept checking flights while closed.
- Track source, observation time, retrieval time and freshness. Handle partial
  failures and deduplicate meaningful changes. Never substitute fixtures into a
  failed live response and label them live.
- Keep injected events separate from provider records and real bookings. Recovery
  choices must not falsely retain a cancelled flight's seat, gate or boarding code.
- On-device AI can interpret a request and explain known facts. Deterministic
  rules and authoritative data govern eligibility, deadlines and available options.
- Check Apple's model availability and keep manual controls usable. Show proposed
  recovery priorities for confirmation; AI output must not perform ticketing or
  invent inventory, operational causes or guarantees.
- Native Live Activities and push notifications require their own native/backend
  implementation. A browser visualisation is not a completed integration.

## 8. Deliver something the user can actually open

- Continue in this repository and task. Do not create a replacement project merely
  because one integration or permission is missing.
- Carry out authorized, reversible work without repeatedly asking for permission.
  Ask only for genuinely missing input, and continue independent work meanwhile.
- Do not claim access to the user's Desktop from a cloud path permission. Do not
  make the user hunt for unverified controls or repeat information already given.
- Keep instructions short and specific: one verified link and the concrete next
  action. Do not offer localhost as a public preview or recycle an obsolete build.
- Rebuild the bundled HTML when the shared UI changes; the iPhone must not silently
  run an older copy. Follow [the iOS instructions](ios/README.md).
- Distinguish source implemented, browser verified, simulator verified and physical
  device verified. Never claim Swift compiled or Apple AI worked based on a web test.
- Update this agreement, relevant source documentation and delivery records when
  decisions or verification change. Remove superseded claims instead of layering
  contradictory status notes on top of them.

## Current implementation boundary

As of 28 October 2026, the Xcode source hosts the reviewed web UI, with in-app
simulation controls, a Supabase service adapter and an optional Foundation Models
preference flow. The server owns playback and saved recovery preferences. Native
code stores the anonymous session and uncertain commands in Keychain, refreshes
snapshots while foregrounded and reconnects on return. Browser/model checks pass;
the app and test target now compile with Xcode 26.3 on a GitHub-hosted Mac. All
eight simulator XCTest cases pass ([run](https://github.com/Chadzzy/MLDOT/actions/runs/40634076274)). Physical-device
UI, Keychain/session restoration and Apple model behaviour still need verification.

The user enabled anonymous sign-in. Hosted authenticated tests passed for creation,
resume, idempotent commands, clock progression, preference persistence, version
conflicts and isolation between users. The tests created two anonymous identities
and one demonstration journey; no real booking was made. No project authentication
setting was changed from this workspace.

Scheduled flight monitoring, APNs and native Live Activities remain unconnected.
HKO/MTR calls are manual integrations. Selected recovery itineraries and entertainment
remain local; saving a preference is not ticketing. The clean night-time homepage
photograph and production icon exports were not in the received ZIP.
