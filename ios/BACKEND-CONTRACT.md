# Journey-service boundary — Supabase selected, app not connected

The selected prototype backend is Supabase project `mekjqboywhbtbbabxela`. The first database/API slice is implemented under `supabase/` and `backend/`, tested locally, with the hosted journey RPC now visible but authenticated verification pending. See [backend instructions](../backend/README.md). Scheduled provider monitoring, subscriptions and push delivery below remain future work.

## Ownership

The service owns the journey identity, booked itinerary, traveller entitlements, playback anchor/rate, event history, provider observations and resulting state version. Each command records origin (`demo`, `provider`, `traveller`) and effective time. The app renders a snapshot and submits commands. A scheduled worker checks flight sources according to provider limits even when the app is closed.

The current Swift simulation is deliberately local. Replacing it with a service adapter should retain its UI and the validated web snapshot bridge, while moving authoritative progression to the service. Do not run native and server clocks as competing authorities.

## Commands and responses

Suggested operations:

- Create a demonstration journey from a supported fixture and traveller profile.
- Read a journey snapshot, with version/ETag and source freshness.
- Submit a command: choose playback mode, pause/resume, jump phase, inject/clear an event, or confirm a recovery preference.
- Subscribe to version changes while foregrounded; use APNs for relevant background updates.
- Register/revoke an APNs token for the authenticated installation. Native Live Activity tokens are separate from ordinary notification device tokens.

A command carries `commandId` (idempotency key), `expectedVersion`, `type` and validated arguments. The server authenticates ownership and demo privileges, rejects stale mutations, and returns the authoritative snapshot. Retrying must not duplicate notifications or recovery actions. Replay and live-follow journeys must be distinguishable; injected events must never mutate provider records or real bookings.

## Live observation processing

Persist provider name, source observation timestamp, retrieval timestamp, raw status and normalized fields. Use a dated operating-flight identity, not a flight number alone. Compare meaningful changes, deduplicate notifications, and mark stale/missing observations without replacing them with demo values. Weather warnings do not establish a flight cancellation or maintenance cause. Monitoring frequency must match each provider's limits and the journey stage.

## Current blockers

The project URL and publishable key are configured and Auth health is verified. The journey RPC exists and denies unsigned access. Anonymous sign-in is disabled; a user session and authenticated verification are still needed. The native app still uses local simulation. No flight-status provider has been integrated. The existing HKO/MTR integrations are manual and do not supply a flight's status. APNs credentials, signing team and native Live Activity extension remain future work. On-device AI only proposes a passenger preference and cannot grant eligibility, promise a connection or select nonexistent inventory.
