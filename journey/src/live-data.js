// Public, credential-free DATA.GOV.HK feeds. No traveller details leave the browser.
export const LIVE_SOURCES = [
  {
    id: "weather",
    name: "HKO · airport temperature",
    owner: "Hong Kong Observatory",
    endpoint:
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en",
    dataset:
      "https://data.gov.hk/en-data/dataset/hk-hko-rss-current-weather-report",
    maxAgeMs: 2 * 60 * 60 * 1000,
  },
  {
    id: "warnings",
    name: "HKO · weather warnings",
    owner: "Hong Kong Observatory",
    endpoint:
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=en",
    dataset:
      "https://data.gov.hk/en-data/dataset/hk-hko-rss-weather-warning-summary",
    maxAgeMs: 5 * 60 * 1000,
  },
  {
    id: "trains",
    name: "MTR · Airport Express",
    owner: "MTR Corporation Limited",
    endpoint:
      "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=AEL&sta=HOK",
    dataset: "https://data.gov.hk/en-data/dataset/mtr-data2-nexttrain-data",
    maxAgeMs: 90 * 1000,
  },
];

function object(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(message);
  return value;
}
function iso(value, message) {
  if (
    typeof value !== "string" ||
    !/(Z|[+-]\d\d:\d\d)$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error(message);
  return new Date(value).toISOString();
}
export function hkTimestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
  )
    throw new Error("MTR timestamp is missing or invalid.");
  return iso(value.replace(" ", "T") + "+08:00", "Invalid MTR timestamp.");
}
export function parseWeather(payload) {
  object(payload, "HKO returned an invalid report.");
  const station = payload.temperature?.data?.find(
    (row) => row.place === "Chek Lap Kok",
  );
  if (
    !station ||
    station.unit !== "C" ||
    typeof station.value !== "number" ||
    !Number.isFinite(station.value) ||
    station.value < -30 ||
    station.value > 60
  )
    throw new Error("HKO did not return a valid Chek Lap Kok temperature.");
  return {
    station: station.place,
    temperature: station.value,
    observedAt: iso(
      payload.temperature.recordTime,
      "HKO observation time is missing.",
    ),
    publishedAt: iso(payload.updateTime, "HKO publication time is missing."),
  };
}
export function parseWarnings(payload) {
  object(payload, "HKO returned an invalid warning summary.");
  const warnings = Object.entries(payload).map(([key, item]) => {
    object(item, "Malformed HKO warning.");
    if (
      typeof item.name !== "string" ||
      typeof item.code !== "string" ||
      !["ISSUE", "REISSUE", "CANCEL", "EXTEND", "UPDATE"].includes(
        item.actionCode,
      )
    )
      throw new Error("Unrecognised HKO warning fields.");
    return {
      key,
      name: item.name,
      code: item.code,
      action: item.actionCode,
      issuedAt: iso(item.issueTime, "Warning issue time is missing."),
      updatedAt: iso(item.updateTime, "Warning update time is missing."),
      expiresAt: item.expireTime
        ? iso(item.expireTime, "Invalid warning expiry.")
        : null,
    };
  });
  return { warnings };
}
export function parseTrains(payload) {
  object(payload, "MTR returned an invalid response.");
  if (payload.status !== 1)
    throw new Error(
      `MTR: ${typeof payload.message === "string" ? payload.message.slice(0, 160) : "schedule unavailable"}`,
    );
  const station = object(
    payload.data?.["AEL-HOK"],
    "MTR returned no Hong Kong station data.",
  );
  if (station.UP !== undefined && !Array.isArray(station.UP))
    throw new Error("MTR returned an invalid train list.");
  const trains = (station.UP || [])
    .filter((row) => row.valid === "Y")
    .map((row) => {
      if (!["AWE", "AIR"].includes(row.dest) || typeof row.plat !== "string")
        throw new Error("Unexpected Airport Express destination or platform.");
      return {
        destination: row.dest === "AWE" ? "AsiaWorld-Expo" : "Airport",
        destinationCode: row.dest,
        platform: row.plat,
        time: hkTimestamp(row.time),
        estimateSource: row.source || null,
      };
    });
  return {
    station: "Hong Kong",
    line: "Airport Express",
    observedAt: hkTimestamp(station.curr_time || payload.curr_time),
    delayed: payload.isdelay === "Y",
    trains,
  };
}
const parsers = {
  weather: parseWeather,
  warnings: parseWarnings,
  trains: parseTrains,
};
export async function fetchLiveSource(
  source,
  fetcher = fetch,
  now = () => Date.now(),
) {
  const start = now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let httpStatus = null;
  try {
    const response = await fetcher(source.endpoint, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    httpStatus = response.status;
    if (!response.ok)
      throw new Error(`Provider returned HTTP ${response.status}.`);
    const data = parsers[source.id](await response.json());
    return {
      id: source.id,
      status: "ok",
      httpStatus,
      requestedAt: new Date(start).toISOString(),
      receivedAt: new Date(now()).toISOString(),
      latencyMs: now() - start,
      data,
    };
  } catch (error) {
    return {
      id: source.id,
      status: "error",
      httpStatus,
      requestedAt: new Date(start).toISOString(),
      receivedAt: new Date(now()).toISOString(),
      latencyMs: now() - start,
      data: null,
      error:
        error.name === "AbortError"
          ? "Provider request timed out."
          : error.message || "Network request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
export async function fetchLiveSources(
  fetcher = fetch,
  now = () => Date.now(),
) {
  const responses = await Promise.all(
    LIVE_SOURCES.map((source) => fetchLiveSource(source, fetcher, now)),
  );
  return Object.fromEntries(
    responses.map((response) => [response.id, response]),
  );
}
export function freshness(result, now = Date.now()) {
  if (!result || result.status !== "ok") return "unavailable";
  const source = LIVE_SOURCES.find((s) => s.id === result.id);
  const time =
    result.id === "warnings" ? result.receivedAt : result.data.observedAt;
  const age = now - Date.parse(time);
  if (!Number.isFinite(age) || age < -5 * 60000) return "clock mismatch";
  return age > source.maxAgeMs ? "stale" : "current";
}
export function activeWarnings(data, now = Date.now()) {
  return data.warnings.filter(
    (w) =>
      w.action !== "CANCEL" && (!w.expiresAt || Date.parse(w.expiresAt) > now),
  );
}
export function liveTime(value) {
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Hong_Kong",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value)) + " HKT"
  );
}
