import test from "node:test";
import assert from "node:assert/strict";
import { initialState, reducer, deriveJourney } from "../src/model.js";
import { preparationState } from "../src/preparation-model.js";
import { planJourney } from "../src/journey-planner.js";
import { tracePacket } from "../src/decision-trace.js";

test("optional preparation values are validated and a buggy belongs only to the family branch", () => {
  const p = preparationState({
    family: "no",
    buggy: true,
    intent: "invalid",
    feedback: "yes",
    feedbackSent: true,
    feedbackDetail: "a".repeat(500),
  });
  assert.equal(p.intent, null);
  assert.equal(p.buggy, false);
  assert.equal(p.feedbackDetail.length, 300);
  assert.equal(p.feedbackSent, true);
  assert.equal(preparationState({ feedbackSent: true }).feedbackSent, false);
  assert.deepEqual(preparationState(null), preparationState());
});

test("preparation survives disruptions and reload; a new native trip clears trip-specific support and feedback", () => {
  let state = reducer(initialState(), {
    type: "NATIVE_SCENARIO",
    value: "normal",
    journeyID: "trip-one",
  });
  state = reducer(state, {
    type: "PREPARATION",
    values: {
      intent: "easy",
      transport: "rail",
      family: "yes",
      buggy: true,
      assistance: "walking",
      feedback: "yes",
      feedbackSent: true,
    },
  });
  state = reducer(state, { type: "SAVE", id: "clouds" });
  const p = state.preparation;
  state = reducer(state, {
    type: "NATIVE_SCENARIO",
    value: "cancelled",
    journeyID: "trip-one",
  });
  assert.deepEqual(state.preparation, p);
  state = initialState(JSON.stringify(state));
  assert.deepEqual(state.preparation, p);
  state = reducer(state, { type: "PREFERENCE", key: "mood", value: "rest" });
  assert.deepEqual(state.preparation, p);
  state = reducer(state, {
    type: "NATIVE_SCENARIO",
    value: "normal",
    journeyID: "trip-two",
  });
  assert.deepEqual(state.preparation, preparationState());
  assert.deepEqual(state.saved, ["clouds"]);
});

test("chosen transport and intent update advice without overriding disruption or broadcasting private preparation", () => {
  const s = initialState(),
    prep = preparationState({
      intent: "easy",
      transport: "rail",
      family: "yes",
      assistance: "walking",
      feedbackDetail: "private feedback",
    });
  const get = (scenario) =>
    planJourney(deriveJourney({ ...s, scenario }), s.preferences, prep);
  assert.match(get("normal").action.detail, /airport express/);
  assert.equal(get("normal").action.modal, "prep-transport");
  assert.match(get("airport").action.title, /quiet moment/);
  assert.equal(get("delay").action.modal, "readiness");
  assert.equal(get("cancelled").action.modal, "recovery");
  const p = get("airport"),
    trace = JSON.stringify(tracePacket(p, []));
  assert.ok(!trace.includes("private feedback"));
  assert.ok(!trace.includes('"assistance"'));
  assert.ok(!trace.includes('"family"'));
});
