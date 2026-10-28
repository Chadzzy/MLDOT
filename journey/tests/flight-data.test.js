import test from "node:test";
import assert from "node:assert/strict";
import {
  flightQuery,
  parseFlightStatus,
  estimatedBoarding,
  flightFreshness,
} from "../src/flight-data.js";
const q = flightQuery("CX383", "2026-10-28");
function response(overrides = {}) {
  return {
    lastUpdateGMT: "2026-10-28 08:00:00",
    errors: null,
    result: [
      {
        operatingFlight: { carrierCode: "CX", flightNumber: "383" },
        sectors: [
          {
            origin: "HKG",
            destination: "ZRH",
            departScheduled: "2026-10-28 00:25:00",
            arrivalScheduled: "2026-10-28 07:30:00",
            originScheduledOffset: "+0800",
            destinationScheduledOffset: "+0100",
            departEstimated: null,
            departActual: null,
            arrivalEstimated: null,
            arrivalActual: null,
            flightStatus: "SCHEDULED",
            gateNumber: null,
            ...overrides,
          },
        ],
      },
    ],
  };
}
test("flight identity and calendar date are validated before calling the source", () => {
  assert.equal(flightQuery(" cx 383 ", "2026-10-28").flightNumber, "383");
  for (const input of ["CX0", "BA383", "383/route", ""])
    assert.throws(() => flightQuery(input, "2026-10-28"));
  for (const date of ["2026-02-30", "2026-13-01", "28-10-2026", ""])
    assert.throws(() => flightQuery("383", date));
});
test("local departure and arrival offsets survive Hong Kong midnight and European winter time", () => {
  const parsed = parseFlightStatus(response(), q, "2026-10-28T08:00:10Z");
  assert.equal(
    parsed.flights[0].scheduledDeparture,
    "2026-10-27T16:25:00.000Z",
  );
  assert.equal(parsed.flights[0].scheduledArrival, "2026-10-28T06:30:00.000Z");
  assert.equal(parsed.updatedAt, "2026-10-28T08:00:00.000Z");
  assert.equal(parsed.flights[0].gate, null);
  assert.equal(parsed.flights[0].actualDeparture, null);
});
test("boarding estimates stay tied to STD rather than an unconfirmed delay", () => {
  const data = parseFlightStatus(
    response({
      departEstimated: "2026-10-28 02:25:00",
      originEstimatedOffset: "+0800",
      flightStatus: "DELAYED",
    }),
    q,
  );
  assert.equal(data.flights[0].boarding.boarding, "2026-10-27T15:45:00.000Z");
  assert.equal(data.flights[0].boarding.cutoff, "2026-10-27T16:05:00.000Z");
  assert.equal(data.flights[0].boarding.kind, "estimated");
  assert.equal(data.flights[0].status, "DELAYED");
  assert.throws(() => estimatedBoarding(null));
});
test("missing flights, source errors and mismatched identities cannot become on-time fixtures", () => {
  assert.deepEqual(
    parseFlightStatus({ ...response(), result: [] }, q).flights,
    [],
  );
  assert.throws(() =>
    parseFlightStatus({ ...response(), errors: [{ code: "error" }] }, q),
  );
  const wrong = response();
  wrong.result[0].operatingFlight.flightNumber = "334";
  assert.throws(() => parseFlightStatus(wrong, q));
  assert.throws(() =>
    parseFlightStatus(response({ originScheduledOffset: null }), q),
  );
  assert.throws(() =>
    parseFlightStatus(response({ departActual: "bad date" }), q),
  );
});
test("a fresh fetch cannot make stale provider data current", () => {
  const now = Date.parse("2026-10-28T08:10:00Z");
  const data = parseFlightStatus(response(), q, "2026-10-28T08:10:00Z");
  assert.equal(flightFreshness(data, now), "last update");
  assert.equal(
    flightFreshness({ ...data, updatedAt: "2026-10-28T08:09:00Z" }, now),
    "current",
  );
  assert.equal(
    flightFreshness({ ...data, updatedAt: "2026-10-28T09:00:00Z" }, now),
    "clock mismatch",
  );
});
