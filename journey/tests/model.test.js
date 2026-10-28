import test from "node:test";
import assert from "node:assert/strict";
import { BASE_JOURNEY } from "../src/data.js";
import {
  initialState,
  reducer,
  deriveJourney,
  displayFlight,
  rankRecovery,
  time,
  fullDate,
  liveActivity,
  entertainmentMinutes,
} from "../src/model.js";
import {
  demoProvider,
  createHttpProvider,
  validateSnapshot,
} from "../src/providers.js";

test("sample itinerary is consistent across local dates and time zones", () => {
  assert.equal(time(BASE_JOURNEY.flight.departure), "00:25");
  assert.equal(time(BASE_JOURNEY.flight.arrival, "Europe/Zurich"), "06:30");
  assert.match(fullDate(BASE_JOURNEY.flight.departure), /Wed,? 28 Oct 2026/);
  assert.equal(
    (new Date(BASE_JOURNEY.flight.arrival) -
      new Date(BASE_JOURNEY.flight.departure)) /
      60000,
    785,
  );
});

test("gate overlay changes the pass and Live Activity without mutating the source", () => {
  const source = structuredClone(BASE_JOURNEY);
  const journey = deriveJourney(
    reducer(initialState(), { type: "SCENARIO", value: "gate" }),
    source,
  );
  assert.equal(journey.flight.gate, "62");
  assert.equal(liveActivity(journey).value, "62");
  assert.equal(source.flight.gate, "68");
  assert.equal(journey.flight.boarding, source.flight.boarding);
});

test("unknown delay does not extend boarding cutoff or invent an estimate", () => {
  const journey = deriveJourney({ ...initialState(), scenario: "delay" });
  assert.equal(journey.flight.cutoff, BASE_JOURNEY.flight.cutoff);
  assert.equal(journey.flight.departure, BASE_JOURNEY.flight.departure);
  assert.equal(journey.isUncertain, true);
  assert.equal(liveActivity(journey).value, "Updating");
});

test("cancellation invalidates the boarding pass and makes recovery the next action", () => {
  const journey = deriveJourney({ ...initialState(), scenario: "cancelled" });
  assert.equal(journey.passState, "cancelled");
  assert.equal(journey.nextModal, "recovery");
  assert.equal(liveActivity(journey).label, "Recovery options");
});

test("changing priorities changes the best option and preserves cabin tradeoffs", () => {
  assert.equal(rankRecovery("business")[0].id, "business");
  assert.equal(rankRecovery("earliest")[0].id, "earliest");
  assert.equal(rankRecovery("earliest")[0].business, false);
  assert.equal(rankRecovery("business").at(-1).id, "earliest");
});

test("a recovery needs a cancellation and a recognised option", () => {
  const state = initialState();
  assert.equal(reducer(state, { type: "RECOVER", id: "business" }), state);
  const cancelled = reducer(state, { type: "SCENARIO", value: "cancelled" });
  assert.equal(
    reducer(cancelled, { type: "RECOVER", id: "invented" }),
    cancelled,
  );
  const recovered = reducer(cancelled, { type: "RECOVER", id: "earliest" });
  assert.equal(deriveJourney(recovered).passState, "superseded");
  assert.match(deriveJourney(recovered).detail, /simulated/);
  assert.equal(deriveJourney(recovered).recovery.via, "HEL");
});

test("entertainment is retained through disruptions, recovery and reset", () => {
  let state = reducer(initialState(), { type: "SAVE", id: "clouds" });
  state = reducer(state, { type: "PREFERENCE", key: "mood", value: "rest" });
  state = reducer(state, { type: "SCENARIO", value: "cancelled" });
  state = reducer(state, { type: "RECOVER", id: "business" });
  state = reducer(state, { type: "RESET" });
  assert.deepEqual(state.saved, ["clouds"]);
  assert.equal(state.preferences.mood, "rest");
  assert.equal(state.scenario, "normal");
  assert.equal(state.recoveryId, null);
});

test("saved entertainment supports ordering, removal and accurate duration", () => {
  let state = initialState();
  for (const id of ["clouds", "perfect", "city"])
    state = reducer(state, { type: "SAVE", id });
  assert.equal(entertainmentMinutes(state.saved), 229);
  state = reducer(state, { type: "MOVE", id: "perfect", direction: -1 });
  assert.deepEqual(state.saved, ["perfect", "clouds", "city"]);
  assert.equal(
    reducer(state, { type: "MOVE", id: "perfect", direction: -1 }),
    state,
  );
  state = reducer(state, { type: "SAVE", id: "clouds" });
  assert.deepEqual(state.saved, ["perfect", "city"]);
  assert.equal(reducer(state, { type: "SAVE", id: "missing" }), state);
});

test("persisted state is validated rather than trusting arbitrary local storage", () => {
  assert.equal(initialState("{bad").scenario, "normal");
  assert.deepEqual(initialState("null").saved, []);
  const state = initialState(
    JSON.stringify({
      scenario: "invented",
      recoveryId: "business",
      saved: ["clouds", "bad", "clouds"],
      preferences: {
        mood: "bad",
        recoveryText: "x".repeat(900),
        quiet: "false",
      },
    }),
  );
  assert.equal(state.scenario, "normal");
  assert.equal(state.recoveryId, null);
  assert.deepEqual(state.saved, ["clouds"]);
  assert.equal(state.preferences.recoveryText.length, 500);
  assert.equal(state.preferences.quiet, true);
});

test("local provider reports zero network requests and returns independent data", async () => {
  const a = await demoProvider.getSnapshot();
  a.data.flight.gate = "99";
  const b = await demoProvider.getSnapshot();
  assert.equal(b.data.flight.gate, "68");
  assert.equal(b.evidence.transport, "local");
  assert.equal(b.evidence.networkRequests, 0);
  assert.equal(b.data.provenance.kind, "demo");
});

test("future HTTP adapter surfaces errors rather than falling back to invented live data", async () => {
  await assert.rejects(
    createHttpProvider("/api/journey", async () => ({
      ok: false,
      status: 403,
    })).getSnapshot(),
    /403/,
  );
  await assert.rejects(
    createHttpProvider("/api/journey", async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: {} }),
    })).getSnapshot(),
    /incomplete/,
  );
  assert.throws(
    () =>
      validateSnapshot({ ...BASE_JOURNEY, provenance: { kind: "unknown" } }),
    /provenance/,
  );
  assert.throws(
    () =>
      validateSnapshot({
        ...BASE_JOURNEY,
        flight: { ...BASE_JOURNEY.flight, arrival: "invalid" },
      }),
    /arrival/,
  );
});

test("future HTTP adapter preserves explicitly supplied provenance and validates the response", async () => {
  const result = await createHttpProvider("/api/journey", async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: structuredClone(BASE_JOURNEY),
      evidence: { provider: "Test service" },
    }),
  })).getSnapshot();
  assert.equal(result.evidence.transport, "http");
  assert.equal(result.evidence.httpStatus, 200);
  assert.equal(result.data.provenance.kind, "demo");
});

test("connection countdown, pass and activity share the outbound gate and cutoff", () => {
  const journey = deriveJourney(
    reducer(initialState(), { type: "SCENARIO", value: "connection" }),
  );
  assert.equal(journey.connection.minutes, 50);
  assert.equal(journey.clock, journey.connection.arrival);
  assert.equal(time(journey.flight.cutoff), "00:05");
  assert.match(journey.message, new RegExp(`Gate ${journey.flight.gate}`));
  assert.match(
    liveActivity(journey).subtitle,
    new RegExp(`Gate ${journey.flight.gate}`),
  );
  assert.equal(liveActivity(journey).value, "50 min");
});

test("replacement itinerary never inherits the cancelled seat, gate or boarding time", () => {
  const journey = deriveJourney({
    ...initialState(),
    scenario: "cancelled",
    recoveryId: "earliest",
  });
  const replacement = displayFlight(journey);
  assert.equal(replacement.airline, "Finnair");
  assert.equal(replacement.cabin, "Mixed cabin");
  for (const field of [
    "seat",
    "gate",
    "terminal",
    "destinationTerminal",
    "boarding",
  ])
    assert.equal(replacement[field], null);
  assert.equal(journey.flight.seat, "12A");
  assert.equal(journey.passState, "superseded");
});

test("airport moments advance the clock and stop recommending the trip from home", () => {
  const home = deriveJourney(initialState());
  const airport = deriveJourney(
    reducer(initialState(), { type: "SCENARIO", value: "airport" }),
  );
  assert.equal(home.nextModal, "transport");
  assert.equal(airport.nextModal, "lounge");
  assert.ok(Date.parse(airport.clock) > Date.parse(home.clock));
  assert.ok(Date.parse(airport.clock) < Date.parse(airport.flight.boarding));
});
