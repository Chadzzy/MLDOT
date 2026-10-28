import test from "node:test";
import assert from "node:assert/strict";
import {
  validateNativeSnapshot,
  nativeScenario,
  applyNativeClock,
} from "../src/native-simulation.js";
import { initialState, reducer, deriveJourney } from "../src/model.js";
const packet = {
  version: 1,
  booked: true,
  journeyID: "example",
  phase: "airport",
  event: "",
  clock: "2026-10-27T14:55:00Z",
  revision: 2,
};
test("native bridge rejects invalid clocks, unsupported states and post-departure disruptions", () => {
  assert.ok(validateNativeSnapshot(packet));
  for (const change of [
    { clock: "invalid" },
    { clock: "2026-10-29T00:00:00Z" },
    { phase: "unknown" },
    { event: "unknown" },
    { phase: "arrived", event: "cancelled" },
    { revision: NaN },
  ])
    assert.equal(validateNativeSnapshot({ ...packet, ...change }), null);
});
test("native clock preserves recovery and invalidates used passes at departure", () => {
  const state = reducer(initialState(), { type: "SCENARIO", value: "airport" });
  const j = applyNativeClock(deriveJourney(state), {
    ...packet,
    phase: "inflight",
    clock: "2026-10-27T16:25:00Z",
  });
  assert.equal(j.passState, "used");
  assert.equal(j.nextModal, "entertainment");
  assert.equal(j.clock, "2026-10-27T16:25:00Z");
  assert.equal(nativeScenario({ ...packet, event: "cancelled" }), "cancelled");
});
test("repeated native snapshots and app reload preserve the selected recovery; a new trip clears it", () => {
  let s = reducer(initialState(), {
    type: "NATIVE_SCENARIO",
    value: "cancelled",
    journeyID: "example",
  });
  s = reducer(s, { type: "RECOVER", id: "business" });
  assert.equal(s.recoveryId, "business");
  s = initialState(JSON.stringify(s));
  s = reducer(s, {
    type: "NATIVE_SCENARIO",
    value: "cancelled",
    journeyID: "example",
  });
  assert.equal(s.recoveryId, "business");
  s = reducer(s, {
    type: "NATIVE_SCENARIO",
    value: "cancelled",
    journeyID: "new-trip",
  });
  assert.equal(s.recoveryId, null);
});

test("native preference snapshots validate and preserve confirmed values", () => {
  const preferences = {
    recoveryPriority: "earliest",
    recoveryText: "Arrive early",
  };
  assert.deepEqual(
    validateNativeSnapshot({ ...packet, preferences }).preferences,
    preferences,
  );
  assert.equal(
    validateNativeSnapshot({
      ...packet,
      preferences: { recoveryPriority: "invented", recoveryText: "x" },
    }),
    null,
  );
  assert.equal(
    validateNativeSnapshot({
      ...packet,
      preferences: {
        recoveryPriority: "business",
        recoveryText: "x".repeat(501),
      },
    }),
    null,
  );
});

test("server updates preserve a local recovery draft through reload and clear it for a new journey", () => {
  let s = reducer(initialState(), {
    type: "NATIVE_SCENARIO",
    value: "cancelled",
    journeyID: "a",
  });
  s = reducer(s, {
    type: "SERVER_PREFERENCES",
    journeyID: "a",
    preferences: {
      recoveryPriority: "business",
      recoveryText: "Original saved note",
    },
  });
  s = reducer(s, {
    type: "PREFERENCE",
    key: "recoveryText",
    value: "My unsaved edit",
  });
  s = initialState(JSON.stringify(s));
  s = reducer(s, {
    type: "SERVER_PREFERENCES",
    journeyID: "a",
    preferences: {
      recoveryPriority: "earliest",
      recoveryText: "A late server response",
    },
  });
  assert.equal(s.preferences.recoveryText, "My unsaved edit");
  assert.equal(s.preferences.recoveryPriority, "earliest");
  s = reducer(s, { type: "NATIVE_SCENARIO", value: "normal", journeyID: "b" });
  s = reducer(s, {
    type: "SERVER_PREFERENCES",
    journeyID: "b",
    preferences: { recoveryPriority: "business", recoveryText: "" },
  });
  assert.equal(s.preferences.recoveryText, "");
});
