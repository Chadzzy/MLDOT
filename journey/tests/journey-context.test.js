import test from "node:test";
import assert from "node:assert/strict";
import { deriveJourney, initialState, reducer } from "../src/model.js";
import {
  boardingContext,
  weatherContext,
  readinessContext,
} from "../src/journey-context.js";
import { applyNativeClock } from "../src/native-simulation.js";
const journey = (scenario) =>
  deriveJourney(reducer(initialState(), { type: "SCENARIO", value: scenario }));
test("airport activities share the live journey clock and reserve walking time and a buffer", () => {
  const j = journey("airport");
  assert.equal(boardingContext(j).minutes, 50);
  assert.equal(boardingContext(j).availableMinutes, 25);
  assert.equal(boardingContext(j).leaveBy, "2026-10-27T15:20:00.000Z");
  const later = applyNativeClock(j, {
    booked: true,
    phase: "airport",
    clock: "2026-10-27T15:25:00Z",
  });
  assert.equal(boardingContext(later).minutes, 20);
  assert.equal(boardingContext(later).availableMinutes, 0);
  assert.equal(boardingContext(later).kind, "due");
});
test("unknown delay or replacement never creates extra activity time", () => {
  for (const scenario of ["delay", "cancelled"]) {
    assert.equal(boardingContext(journey(scenario)).kind, "unconfirmed");
    assert.equal(boardingContext(journey(scenario)).availableMinutes, 0);
  }
  const boarded = { ...journey("airport"), clock: "2026-10-27T15:45:00Z" };
  assert.equal(boardingContext(boarded).label, "It’s time to board");
  assert.match(
    boardingContext({ ...boarded, clock: "2026-10-27T16:05:00Z" }).label,
    /closing/,
  );
});
test("worsening weather cannot by itself confirm flight impact or maintenance", () => {
  const watch = journey("airport");
  assert.equal(weatherContext(watch).stage, "watch");
  const worse = { ...watch, clock: "2026-10-27T15:15:00Z" };
  assert.equal(weatherContext(worse).stage, "worsening");
  assert.equal(worse.isUncertain, false);
  assert.match(readinessContext(worse).summary, /no flight delay is confirmed/);
  const delayed = journey("delay");
  assert.equal(weatherContext(delayed).stage, "impact");
  assert.match(readinessContext(delayed).title, /weather/);
  const unknown = { ...delayed, disruptionCause: "unknown" };
  assert.match(readinessContext(unknown).summary, /not been confirmed/);
  assert.notEqual(weatherContext(unknown).stage, "impact");
  assert.match(
    readinessContext({ ...delayed, disruptionCause: "maintenance" }).title,
    /Aircraft checks/,
  );
});
