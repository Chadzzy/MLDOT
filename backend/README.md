# Supabase journey backend

Read the [working agreement](../WORKING_AGREEMENT.md) before editing.

Project: **mekjqboywhbtbbabxela** — https://mekjqboywhbtbbabxela.supabase.co

## Current status

The supplied project responds over HTTPS. Unauthenticated REST/Auth requests return `401 No API key found in request`, which is expected. No hosted database changes have been made. The publishable key is not yet supplied, and no app user session is configured.

Prepared and tested locally:

- Owner-isolated demonstration journeys and command history, protected by row-level security.
- Server-clock snapshots, guided/accelerated/real-time playback, pause/resume, phase jumps and injected disruptions.
- Saved recovery priorities and request text.
- Optimistic version checks, command idempotency and atomic updates.
- A public-key + user-session API client with timeouts and explicit errors.

The iPhone currently remains in local mode. This commit does not enable scheduled checks, native push, Live Activities, live flight status or real bookings. Entertainment saves and selected recovery options also remain local for now; the database persists the recovery _preference_, not a ticket or selected itinerary.

## One-time hosted setup

1. Open the project's [SQL Editor](https://supabase.com/dashboard/project/mekjqboywhbtbbabxela/sql/new).
2. Paste and run the entire [journey migration](../supabase/migrations/20261028010000_journey_demo.sql). It creates only the named `journey_demo_*` tables/functions and private helper schema. It does not delete existing business tables or alter global default permissions. The script is transactional and can be reapplied without dropping saved journeys.
3. Supply the app's **publishable** key (`sb_publishable_…`) from project Settings → API Keys. This public key identifies the project; it does not grant deployment access or sign a user in. Never use a secret or service-role key in the app.

No Edge Function deployment is required for this first slice: Supabase exposes the database functions through its built-in REST API after the migration. Alternatively, an authorized developer can apply the migration using the Supabase CLI with the project linked. Do not commit administrative tokens or database passwords.

### Authentication boundary

Every operation requires a normal Supabase Auth access token for a signed-in user. A publishable key alone is deliberately insufficient. This setup does not enable anonymous sign-in or change the project's existing authentication settings. A user sign-in flow and secure session storage must be connected to the app before it can call these operations. The backend derives ownership from `auth.uid()`; clients cannot submit an owner ID.

## API

POST to `/rest/v1/rpc/<function>` with headers `apikey: <publishable key>`, `Authorization: Bearer <user access token>` and `Content-Type: application/json`.

| Function                | JSON body                                                                   | Behaviour                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `journey_demo_create`   | `p_journey_id` UUID                                                         | Creates the fixed HKG–ZRH demo, or returns the existing journey with that ID if owned by the caller. Retain the UUID for safe retries. |
| `journey_demo_snapshot` | `p_journey_id` UUID                                                         | Calculates the current snapshot using server time.                                                                                     |
| `journey_demo_list`     | `{}`                                                                        | Returns the caller's latest 20 journeys.                                                                                               |
| `journey_demo_command`  | `p_journey_id`, `p_command_id`, `p_expected_version`, `p_command`, `p_args` | Applies one validated command atomically.                                                                                              |

Commands:

| Command          | Arguments                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `set_mode`       | `{"mode":"guided"}`, `"accelerated"` or `"realtime"`                                                           |
| `play` / `pause` | `{}`                                                                                                           |
| `jump`           | `{"phase":"pretravel"}`, `"airport"`, `"boarding"`, `"inflight"` or `"arrived"`                                |
| `inject`         | `{"event":"gate"}`, `"delay"` or `"cancelled"`                                                                 |
| `clear_event`    | `{}`                                                                                                           |
| `preferences`    | `{"priority":"business","text":"Keep my cabin"}`; priority may also be `"earliest"`, text up to 500 characters |

Unknown or extra arguments are rejected. Injection pauses playback and is restricted to before departure. Clear the injected event or jump to a phase before playing again. A guided journey advances only by jumping. Reset starts a new journey UUID, preserving the old demonstration history rather than deleting it.

A snapshot includes the existing native bridge fields (`version: 1`, `journeyID`, `booked`, `phase`, `event`, `clock`, `revision`) plus `serverNow`, `elapsedSeconds`, `durationSeconds`, `mode`, `running`, `rate`, `preferences` and `source: "demo"`. `version` is the payload schema version; **`revision` is the optimistic concurrency version** supplied as `p_expected_version`.

The timeline matches the current Swift fixture: 27 Oct 2026 22:10 HKT start; airport +45m, boarding +95m, departure +135m, arrival +920m. Accelerated playback runs at 92× and completes in ten minutes. At completion, progress is clamped and the snapshot reports stopped playback. The saved anchor means a later request can reconstruct progress while the phone was closed; it does not require an always-running phone timer or a periodic database update. It does not itself monitor providers or send notifications.

## Concurrency and reconnection

Persist the journey UUID and any outstanding command UUID on the client. Retry an uncertain command with the same UUID and arguments. The server returns its original response without applying it twice, even if its expected version is now old. Because that response is the original receipt, follow it with a fresh snapshot after reconnection for the current clock.

A reused command UUID with different arguments or a new command with an old expected version returns HTTP 409. Refresh the snapshot and reconcile the user's intention; do not silently repeat a conflicting action with a new version. Never fall back to fixture data labelled as server state.

When the native adapter is added, the server becomes authoritative for connected journeys. Local interpolation may animate from the returned `serverNow`, elapsed value and rate, then reconcile on foreground/reconnect. Do not also run the independent native simulation clock as a second authority. The current local controls will need to reflect the server rule that injected events remain paused until cleared.

## Verify locally

```sh
node --test backend/tests/*.test.mjs
python backend/tests/postgres.py
```

The PostgreSQL test uses a disposable `postgres:16-alpine` container, no network, no published port and synthetic users. It tests migration/RPC behaviour, owner isolation, anonymous and direct-write denials, failed-command rollback, clock calculations, persisted state, migration reapplication and eight concurrent retries. Its small local `auth.uid()` fixture is **not** a test of Supabase's hosted JWT validation or Auth configuration.

Client tests check request credentials, missing sessions, errors/conflicts, timeout cancellation and malformed JSON. Hosted REST/Auth, iOS integration and device behaviour remain unverified until connected.
