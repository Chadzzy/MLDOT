# Journey-service boundary — Supabase adapter implemented

The selected prototype backend is Supabase project `mekjqboywhbtbbabxela`. The first database/API slice is implemented under `supabase/` and `backend/`, tested locally and through the hosted authenticated REST API. The native adapter compiles with Xcode 26.3 and the eight simulator model tests pass; end-to-end device service testing remains outstanding. See [backend instructions](../backend/README.md). Scheduled provider monitoring, subscriptions and push delivery below remain future work.

## Ownership

The current demonstration service owns the journey identity, fixed fixture, playback anchor/rate, injected event, preferences, command receipts and state revision. The app renders snapshots and submits commands. Provider observations, live entitlements, scheduled checks and origin-aware event processing are future extensions.

The Swift service adapter uses the existing UI and validated web snapshot bridge. Local arithmetic only interpolates the last server snapshot from monotonic receipt time. Foreground refresh runs every 10 seconds, backs off to 30 seconds after errors, and stops when backgrounded. Returning to the app reconciles with the server. Keychain stores the anonymous session and any uncertain command; the web bridge receives no credentials.

## Commands and responses

Implemented operations are create, snapshot, list and command (see the exact RPC contract in backend/README.md). The following also records planned subscription and push extensions:

- Create a demonstration journey from a supported fixture and traveller profile.
- Read a journey snapshot, with version/ETag and source freshness.
- Submit a command: choose playback mode, pause/resume, jump phase, inject/clear an event, or confirm a recovery preference.
- Subscribe to version changes while foregrounded; use APNs for relevant background updates.
- Register/revoke an APNs token for the authenticated installation. Native Live Activity tokens are separate from ordinary notification device tokens.

A command carries `commandId` (idempotency key), `expectedVersion`, `type` and validated arguments. The server authenticates ownership and demo privileges, rejects stale mutations, and returns the authoritative snapshot. Retrying must not duplicate notifications or recovery actions. Replay and live-follow journeys must be distinguishable; injected events must never mutate provider records or real bookings.

## Live observation processing

Persist provider name, source observation timestamp, retrieval timestamp, raw status and normalized fields. Use a dated operating-flight identity, not a flight number alone. Compare meaningful changes, deduplicate notifications, and mark stale/missing observations without replacing them with demo values. Weather warnings do not establish a flight cancellation or maintenance cause. Monitoring frequency must match each provider's limits and the journey stage.

## Verification and next boundaries

The hosted API passed authenticated create/resume, idempotency, clock, preferences,
refresh-session, conflict and cross-user isolation checks. Anonymous sign-in was
enabled by the user. Xcode 26.3 compilation and eight simulator XCTest cases
[passed on a Mac runner](https://github.com/Chadzzy/MLDOT/actions/runs/40634076274). End-to-end Keychain/session behaviour,
physical-device UI and Apple model execution remain unverified.

No flight-status provider or scheduled worker is connected. HKO/MTR calls are manual
and do not supply a flight's status. APNs credentials, signing team and a native
Live Activity extension remain future work. On-device AI proposes a passenger
preference; it cannot grant eligibility, promise a connection or invent inventory.
