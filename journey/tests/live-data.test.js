import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_SOURCES,
  parseWeather,
  parseWarnings,
  parseTrains,
  hkTimestamp,
  fetchLiveSource,
  fetchLiveSources,
  freshness,
  activeWarnings,
} from "../src/live-data.js";
import { loungeAccess } from "../src/lounge-rules.js";
import directory from "../src/venue-directory.json" with { type: "json" };
const weather = {
  temperature: {
    recordTime: "2026-10-26T23:00:00+08:00",
    data: [{ place: "Chek Lap Kok", value: 27, unit: "C" }],
  },
  updateTime: "2026-10-26T23:02:00+08:00",
};
const train = {
  status: 1,
  isdelay: "N",
  data: {
    "AEL-HOK": {
      curr_time: "2026-10-26 23:55:00",
      UP: [
        { dest: "AWE", time: "2026-10-27 00:12:00", plat: "1", valid: "Y" },
        { dest: "AWE", time: "2026-10-27 00:24:00", plat: "1", valid: "N" },
      ],
    },
  },
};
const now = () => Date.parse("2026-10-26T15:55:00Z");
test("weather requires the airport station and its observation time, not just HTTP 200", () => {
  assert.equal(parseWeather(weather).temperature, 27);
  assert.equal(parseWeather(weather).observedAt, "2026-10-26T15:00:00.000Z");
  assert.throws(
    () =>
      parseWeather({
        ...weather,
        temperature: {
          ...weather.temperature,
          data: [{ place: "Hong Kong Observatory", value: 27, unit: "C" }],
        },
      }),
    /Chek Lap Kok/,
  );
  assert.throws(
    () =>
      parseWeather({
        ...weather,
        temperature: { ...weather.temperature, recordTime: "yesterday" },
      }),
    /observation/,
  );
});
test("MTR midnight dates retain HKT; invalid trains and provider errors are not made current", () => {
  assert.equal(hkTimestamp("2026-10-27 00:12:00"), "2026-10-26T16:12:00.000Z");
  const parsed = parseTrains(train);
  assert.equal(parsed.trains.length, 1);
  assert.equal(parsed.trains[0].destination, "AsiaWorld-Expo");
  assert.throws(
    () => parseTrains({ status: 0, message: "Station not available" }),
    /Station not available/,
  );
  assert.throws(
    () => parseTrains({ status: 1, data: {} }),
    /no Hong Kong station/,
  );
});
test("warning absence, cancellation and expiry are distinct from an invalid response", () => {
  assert.deepEqual(parseWarnings({}), { warnings: [] });
  const w = {
    name: "Thunderstorm Warning",
    code: "WTS",
    actionCode: "ISSUE",
    issueTime: "2026-10-26T23:00:00+08:00",
    updateTime: "2026-10-26T23:00:00+08:00",
    expireTime: "2026-10-27T00:00:00+08:00",
  };
  assert.equal(activeWarnings(parseWarnings({ WTS: w }), now()).length, 1);
  assert.equal(
    activeWarnings(
      parseWarnings({ WTS: { ...w, actionCode: "CANCEL" } }),
      now(),
    ).length,
    0,
  );
  assert.equal(
    activeWarnings(parseWarnings({ WTS: w }), now() + 60 * 60 * 1000).length,
    0,
  );
  assert.throws(() => parseWarnings({ message: "error" }), /Malformed/);
});
test("per-source freshness and device clock mismatch prevent misleading live badges", () => {
  const r = {
    id: "weather",
    status: "ok",
    data: parseWeather(weather),
    receivedAt: new Date(now()).toISOString(),
  };
  assert.equal(freshness(r, now()), "current");
  assert.equal(freshness(r, now() + 2 * 60 * 60 * 1000), "stale");
  assert.equal(freshness(r, now() - 2 * 60 * 60 * 1000), "clock mismatch");
  const t = {
    id: "trains",
    status: "ok",
    data: parseTrains(train),
    receivedAt: r.receivedAt,
  };
  assert.equal(freshness(t, now() + 91000), "stale");
});
test("live fetch failures retain evidence and never substitute demo values", async () => {
  const bad = await fetchLiveSource(
    LIVE_SOURCES[0],
    async () => ({ ok: true, status: 200, json: async () => ({}) }),
    now,
  );
  assert.equal(bad.status, "error");
  assert.equal(bad.httpStatus, 200);
  assert.equal(bad.data, null);
  const unavailable = await fetchLiveSource(
    LIVE_SOURCES[0],
    async () => ({ ok: false, status: 403 }),
    now,
  );
  assert.equal(unavailable.httpStatus, 403);
  assert.match(unavailable.error, /403/);
  const offline = await fetchLiveSource(
    LIVE_SOURCES[0],
    async () => {
      throw new TypeError("Failed to fetch");
    },
    now,
  );
  assert.equal(offline.httpStatus, null);
  assert.equal(offline.data, null);
});
test("three independent browser requests omit credentials and preserve partial success", async () => {
  const called = [];
  const results = await fetchLiveSources(async (url, options) => {
    called.push(url);
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    if (url.includes("warnsum")) throw new Error("Unavailable");
    return {
      ok: true,
      status: 200,
      json: async () => (url.includes("getSchedule") ? train : weather),
    };
  }, now);
  assert.equal(called.length, 3);
  assert.equal(results.weather.status, "ok");
  assert.equal(results.trains.status, "ok");
  assert.equal(results.warnings.status, "error");
});
test("closed lounge overrides tier; unknown travel facts cannot grant access", () => {
  const closed = directory.venues.find((v) => v.id === "cathay-wing-business");
  assert.equal(loungeAccess(closed, "diamond").kind, "closed");
  assert.equal(
    directory.venues.filter(
      (v) => loungeAccess(v, "business").kind === "eligible",
    ).length,
    3,
  );
  assert.equal(
    directory.venues.filter(
      (v) => loungeAccess(v, "diamond").kind === "eligible",
    ).length,
    5,
  );
  assert.equal(
    directory.venues.filter(
      (v) => loungeAccess(v, "unknown").kind === "unknown",
    ).length,
    5,
  );
  assert.ok(
    directory.venues
      .find((v) => v.id === "cathay-wing-first")
      .notices.some((n) => n.type === "temporary_access_restriction"),
  );
});
