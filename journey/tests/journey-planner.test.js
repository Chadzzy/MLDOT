import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveJourney,
  initialState,
  reducer,
  rankRecovery,
} from "../src/model.js";
import {
  planJourney,
  applyPlan,
  appendDecision,
} from "../src/journey-planner.js";
import { tracePacket, validTrace } from "../src/decision-trace.js";

const state = initialState();
const journey = (scenario) =>
  deriveJourney(reducer(state, { type: "SCENARIO", value: scenario }));
const plan = (j, prefs = state.preferences) => planJourney(j, prefs);

test("airport recommendation, time budget and trace agree; worsening weather removes lounge without inventing delay", () => {
  const j = journey("airport"),
    before = plan(j);
  assert.equal(before.action.id, "lounge");
  assert.equal(before.timing.availableMinutes, 25);
  assert.equal(before.options.find((o) => o.id === "lounge").eligible, true);
  const worsening = { ...j, clock: "2026-10-27T15:15:00Z" };
  const after = plan(worsening);
  assert.equal(after.action.id, "stay-nearby");
  assert.equal(after.status, "Everything is on track");
  assert.equal(after.options.find((o) => o.id === "lounge").eligible, false);
  assert.equal(applyPlan(worsening, after).nextDetail, after.action.detail);
  const due = plan({ ...j, clock: "2026-10-27T15:25:00Z" });
  assert.equal(due.action.id, "gate");
  assert.equal(due.action.modal, "pass");
  assert.equal(due.timing.availableMinutes, 0);
});

test("unknown delay withholds leisure time and explains known weather rather than maintenance", () => {
  const p = plan(journey("delay"));
  assert.equal(p.action.modal, "readiness");
  assert.equal(p.timing.availableMinutes, 0);
  assert.ok(p.reasons.includes("CONFIRMED_SCENARIO_WEATHER_DELAY"));
  assert.ok(p.options.every((o) => !o.eligible));
  const unknown = plan({ ...journey("delay"), disruptionCause: null });
  assert.ok(unknown.reasons.includes("CAUSE_UNCONFIRMED"));
});

test("cancellation, priority change, recovery and gate route use shared rules", () => {
  const j = journey("cancelled");
  for (const priority of ["earliest", "business"]) {
    const p = plan(j, { ...state.preferences, recoveryPriority: priority });
    assert.deepEqual(
      p.recoveryOrder,
      rankRecovery(priority).map((o) => o.id),
    );
    assert.equal(p.action.modal, "recovery");
  }
  assert.equal(plan(journey("gate")).action.modal, "directions");
  assert.equal(plan(journey("connection")).action.modal, "connection");
  assert.equal(
    plan({ ...j, recovery: rankRecovery("business")[0] }).reasons[0],
    "RECOVERY_SELECTED",
  );
});

test("history records decision changes without filling up on clock ticks", () => {
  const j = journey("airport"),
    first = plan(j);
  let h = appendDecision([], first);
  assert.equal(
    appendDecision(h, plan({ ...j, clock: "2026-10-27T14:56:00Z" })),
    h,
  );
  h = appendDecision(h, plan({ ...j, clock: "2026-10-27T15:15:00Z" }));
  assert.equal(h.length, 2);
  assert.equal(h[1].previous, first.action.title);
  for (let i = 0; i < 40; i++)
    h = appendDecision(h, plan(journey(i % 2 ? "delay" : "airport")));
  assert.equal(h.length, 30);
});

test("trace excludes passenger identity, free text and native credentials; rejects malformed network messages", () => {
  const p = plan(journey("airport"), {
    ...state.preferences,
    recoveryText: "private travel request",
  });
  const packet = tracePacket(p, appendDecision([], p));
  assert.equal(validTrace(packet), true);
  const serialized = JSON.stringify(packet);
  for (const privateValue of [
    "Emma",
    "CHAN",
    "19,932",
    "12A",
    "private travel request",
    "access_token",
    "nativeJourneyID",
  ])
    assert.ok(!serialized.includes(privateValue));
  assert.equal(
    validTrace({ ...packet, plan: { ...p, action: { title: {} } } }),
    false,
  );
  assert.equal(validTrace({ ...packet, history: [{ title: "x" }] }), false);
  assert.equal(validTrace({ ...packet, observation: {} }), false);
  assert.equal(validTrace(null), false);
  assert.equal(
    validTrace({ ...packet, plan: { ...p, inputs: [null] } }),
    false,
  );
  assert.equal(
    validTrace({ ...packet, plan: { ...p, options: [null] } }),
    false,
  );
  assert.equal(validTrace({ ...packet, history: [null] }), false);
});
