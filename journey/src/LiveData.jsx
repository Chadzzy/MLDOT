import { useCallback, useEffect, useRef, useState } from "react";
import { useJourney } from "./context.js";
import { Icon } from "./icons.jsx";
import {
  LIVE_SOURCES,
  fetchLiveSources,
  fetchLiveSource,
  freshness,
  liveTime,
  activeWarnings,
} from "./live-data.js";

export function useLiveData() {
  const [weatherMonitoring, setWeatherMonitoring] = useState(() => {
    try {
      return localStorage.getItem("journey-weather-monitoring") === "true";
    } catch {
      return false;
    }
  });
  const [weatherCheck, setWeatherCheck] = useState({
    loading: false,
    result: null,
    checkedAt: null,
    count: 0,
  });
  const weatherPending = useRef(false);
  const hostActive = useRef(true);
  const lastWeatherCheck = useRef(0);
  useEffect(() => {
    try {
      localStorage.setItem(
        "journey-weather-monitoring",
        String(weatherMonitoring),
      );
    } catch {
      /* session only */
    }
    if (!weatherMonitoring) return;
    let active = true;
    const check = async () => {
      if (
        !active ||
        !hostActive.current ||
        document.hidden ||
        weatherPending.current ||
        Date.now() - lastWeatherCheck.current < 55000
      )
        return;
      weatherPending.current = true;
      lastWeatherCheck.current = Date.now();
      setWeatherCheck((s) => ({ ...s, loading: true }));
      const result = await fetchLiveSource(
        LIVE_SOURCES.find((source) => source.id === "warnings"),
      );
      weatherPending.current = false;
      setWeatherCheck((s) => ({
        loading: false,
        result,
        checkedAt: result.receivedAt,
        count: s.count + 1,
      }));
    };
    const hostChanged = (event) => {
      hostActive.current = event.detail === true;
      if (hostActive.current) check();
    };
    const timer = setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("journey-host-active", hostChanged);
    check();
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("journey-host-active", hostChanged);
    };
  }, [weatherMonitoring]);
  const [live, setLive] = useState({
    attempted: false,
    loading: false,
    requests: 0,
    results: {},
    lastAttempt: null,
  });
  const pending = useRef(null);
  const lastAttempt = useRef(0);
  const refreshLive = useCallback(() => {
    if (pending.current) return pending.current;
    if (Date.now() - lastAttempt.current < 30000) return Promise.resolve();
    lastAttempt.current = Date.now();
    setLive((s) => ({
      ...s,
      attempted: true,
      loading: true,
      lastAttempt: new Date().toISOString(),
      requests: s.requests + LIVE_SOURCES.length,
    }));
    pending.current = fetchLiveSources()
      .then((results) => setLive((s) => ({ ...s, results, loading: false })))
      .finally(() => {
        pending.current = null;
      });
    return pending.current;
  }, []);
  return {
    live,
    refreshLive,
    weatherMonitoring,
    setWeatherMonitoring,
    weatherCheck,
  };
}
export function useLiveClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
function Evidence({ result }) {
  if (!result) return null;
  return (
    <small className="live-evidence">
      {result.httpStatus ? `HTTP ${result.httpStatus}` : "No HTTP response"} ·{" "}
      {result.latencyMs} ms
      <br />
      Retrieved {liveTime(result.receivedAt)}
      {result.data?.observedAt && (
        <>
          <br />
          Observed {liveTime(result.data.observedAt)}
        </>
      )}
    </small>
  );
}
export function LiveWarningWatch({ controls = false }) {
  const { weatherMonitoring, setWeatherMonitoring, weatherCheck } =
    useJourney();
  const now = useLiveClock();
  if (!weatherMonitoring)
    return controls ? (
      <button
        className="live-weather-connect"
        onClick={() => setWeatherMonitoring(true)}
      >
        <Icon name="cloud" size={18} />
        Follow live HKO warnings
      </button>
    ) : null;
  const result = weatherCheck.result;
  const current = freshness(result, now) === "current";
  const warnings = current ? activeWarnings(result.data, now) : [];
  return (
    <section
      className="weather-watch live-warning-watch"
      aria-label="Live weather monitoring"
    >
      <strong>Hong Kong Observatory · live warnings</strong>
      <p>
        {weatherCheck.loading && !result
          ? "Checking official warnings…"
          : !current
            ? "The weather check is unavailable or out of date. We’ll try again; no all-clear is assumed."
            : warnings.length
              ? warnings.map((warning) => warning.name).join(" · ")
              : "No active warnings in the latest response."}
      </p>
      <small>
        {weatherCheck.checkedAt
          ? `Last check ${liveTime(weatherCheck.checkedAt)} · ${weatherCheck.count} ${weatherCheck.count === 1 ? "check" : "checks"}`
          : "First check in progress"}
      </small>
      <small>
        Checks every minute while the app is open. These regional warnings do
        not establish an impact on your demonstration flight.
      </small>
      {controls && (
        <button
          className="text-button"
          onClick={() => setWeatherMonitoring(false)}
        >
          Stop live warning checks
        </button>
      )}
    </section>
  );
}

export function LiveWeatherCard() {
  const { live, refreshLive } = useJourney();
  const now = useLiveClock();
  const result = live.results.weather;
  if (!live.attempted)
    return (
      <button className="live-weather-connect" onClick={refreshLive}>
        <Icon name="cloud" size={17} />
        Check Hong Kong weather now <Icon name="refresh" size={14} />
      </button>
    );
  return (
    <div className="live-weather-card">
      <span className="live-source-tag">
        Hong Kong Observatory ·{" "}
        {result?.status === "ok"
          ? freshness(result, now) === "current"
            ? "live source"
            : "last observation"
          : "live request"}
      </span>
      {result?.status === "ok" ? (
        <>
          <div className="live-temperature">
            <span>
              HKG · Chek Lap Kok<small>Observed temperature now</small>
            </span>
            <strong>{result.data.temperature}°C</strong>
          </div>
          <small>
            Observed {liveTime(result.data.observedAt)}
            {freshness(result, now) !== "current" &&
              ` · ${freshness(result, now)}`}
          </small>
        </>
      ) : (
        <p>
          {live.loading
            ? "Calling Hong Kong Observatory…"
            : "Live weather unavailable. The journey outlook below uses sample weather."}
        </p>
      )}
      <p>
        Current conditions are separate from the sample flight forecast below.
      </p>
    </div>
  );
}
export function LiveSourcesPanel({ onOpen }) {
  const { live } = useJourney();
  const succeeded = Object.values(live.results).filter(
    (r) => r.status === "ok",
  ).length;
  return (
    <div className="live-site-panel">
      <strong>Real data connections</strong>
      <p>
        {live.loading
          ? "Calling official APIs…"
          : live.attempted
            ? `${succeeded} of 3 requests returned valid data`
            : "HKO weather · warnings · Airport Express"}
      </p>
      <button onClick={onOpen}>
        <Icon name="refresh" size={14} />
        {live.attempted ? "View live sources" : "Try live sources"}
      </button>
      <small>Flight changes and bookings remain simulated.</small>
    </div>
  );
}
export function LiveSources() {
  const { live, refreshLive, open } = useJourney();
  const now = useLiveClock();
  useEffect(() => {
    refreshLive();
  }, [refreshLive]);
  const cooling =
    live.lastAttempt && now - Date.parse(live.lastAttempt) < 30000;
  return (
    <>
      <h2>Hong Kong, right now</h2>
      <p className="intro">
        These cards call official public APIs from your browser. No account or
        API key is used.
      </p>
      <button
        className="primary-button"
        disabled={live.loading || cooling}
        aria-busy={live.loading}
        onClick={refreshLive}
      >
        <Icon
          name="refresh"
          size={17}
          className={live.loading ? "busy-icon" : ""}
        />
        {live.loading
          ? "Calling live sources…"
          : cooling
            ? "Refresh available after 30 seconds"
            : "Refresh live sources"}
      </button>
      <p className="live-request-count">
        {live.requests} outbound requests attempted through these cards. Live
        warning monitoring has its own check counter.
      </p>
      {LIVE_SOURCES.map((source) => {
        const result = live.results[source.id];
        const state = freshness(result, now);
        return (
          <article
            className="live-source-card"
            key={source.id}
            aria-busy={live.loading}
          >
            <header>
              <h3>{source.name}</h3>
              <span className={`live-result ${state}`}>
                {result?.status === "ok"
                  ? state
                  : live.loading
                    ? "Loading"
                    : "Unavailable"}
              </span>
            </header>
            {live.loading && !result && (
              <div className="live-loading" aria-hidden="true">
                <i />
                <i />
              </div>
            )}
            {result?.status === "error" && (
              <p className="live-error">
                {result.error} No replacement sample is shown.
              </p>
            )}
            {result?.status === "ok" && (
              <>
                {source.id === "weather" && (
                  <>
                    <div className="live-temperature">
                      <span>
                        Chek Lap Kok<small>Airport weather station</small>
                      </span>
                      <strong>{result.data.temperature}°C</strong>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => open("weather")}
                    >
                      See this in your weather outlook{" "}
                      <Icon name="arrow" size={14} />
                    </button>
                  </>
                )}
                {source.id === "warnings" &&
                  (activeWarnings(result.data, now).length ? (
                    <ul className="live-warning-list">
                      {activeWarnings(result.data, now).map((w) => (
                        <li key={w.key}>
                          <strong>{w.name}</strong>
                          <small>Updated {liveTime(w.updatedAt)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      No active warnings returned in this response.
                      {state !== "current" && " Refresh to check again."}
                    </p>
                  ))}
                {source.id === "trains" && (
                  <>
                    <p className="live-station">
                      Hong Kong station · Airport Express
                      {result.data.delayed && (
                        <strong> · Delay reported by MTR</strong>
                      )}
                    </p>
                    {result.data.trains.length ? (
                      <div className="live-trains">
                        {result.data.trains.map((train, i) => (
                          <div key={train.time + "-" + i}>
                            <strong>
                              {liveTime(train.time).split(", ").at(-1)}
                            </strong>
                            <span>
                              Towards {train.destination}
                              <small>
                                Platform {train.platform}
                                {Date.parse(train.time) < now
                                  ? " · time passed; refresh"
                                  : ""}
                              </small>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>
                        No valid upcoming trains were returned. This does not
                        confirm that the line is closed.
                      </p>
                    )}
                  </>
                )}
                {state !== "current" && (
                  <p className="live-age-warning">
                    {state === "stale"
                      ? "This observation is stale. Refresh before relying on it."
                      : "The observation time does not match this device’s clock."}
                  </p>
                )}
              </>
            )}
            <Evidence result={result} />
            <a
              className="live-attribution"
              href={source.dataset}
              target="_blank"
              rel="noreferrer"
            >
              Source: {source.owner} / DATA.GOV.HK{" "}
              <Icon name="external" size={12} />
            </a>
            <details className="live-payload">
              <summary>Request & returned fields</summary>
              <code>{source.endpoint}</code>
              {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
            </details>
          </article>
        );
      })}
      <div className="live-limitations">
        <h3>What is still simulated?</h3>
        <p>
          Flight status, gate changes, cancellations and recovery bookings.
          HKIA’s documented open feed is historical and returned HTTP 403 during
          our check.
        </p>
        <p>
          The Cathay directory is curated from official pages, not a live lounge
          availability or admission API.
        </p>
        <a
          href="https://data.gov.hk/en/terms-and-conditions"
          target="_blank"
          rel="noreferrer"
        >
          DATA.GOV.HK terms and attribution
        </a>
      </div>
    </>
  );
}
