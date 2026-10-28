import { useCallback, useEffect, useRef, useState } from "react";
import { useJourney } from "./context.js";
import { Icon } from "./icons.jsx";
import {
  flightQuery,
  parseFlightStatus,
  requestFlightStatus,
  flightFreshness,
  FLIGHT_SOURCE,
} from "./flight-data.js";
const hkgDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function useFlightLookup() {
  const [selection, setSelection] = useState(null);
  const [following, setFollowing] = useState(false);
  const [lookup, setLookup] = useState({
    loading: false,
    result: null,
    error: null,
    checks: 0,
    httpStatus: null,
  });
  const pending = useRef(false),
    lastAttempt = useRef(0),
    hostActive = useRef(true);
  const check = useCallback(async (query) => {
    if (pending.current || Date.now() - lastAttempt.current < 30000) return;
    pending.current = true;
    lastAttempt.current = Date.now();
    setLookup((s) => ({ ...s, loading: true, error: null }));
    try {
      const response = await requestFlightStatus(query);
      const result = parseFlightStatus(
        response.payload,
        query,
        response.receivedAt,
      );
      setSelection(query);
      setLookup((s) => ({
        loading: false,
        result,
        error: null,
        checks: s.checks + 1,
        httpStatus: response.httpStatus,
      }));
    } catch (error) {
      setLookup((s) => ({
        ...s,
        loading: false,
        error: error.message,
        checks: s.checks + 1,
      }));
    } finally {
      pending.current = false;
    }
  }, []);
  useEffect(() => {
    const active = (event) => {
      hostActive.current = event.detail === true;
      tick();
    };
    const tick = () => {
      if (
        following &&
        selection &&
        hostActive.current &&
        !document.hidden &&
        Date.now() - lastAttempt.current >= 60000
      )
        check(selection);
    };
    const timer = setInterval(tick, 10000);
    window.addEventListener("journey-host-active", active);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("journey-host-active", active);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [check, following, selection]);
  return {
    lookup,
    checkFlight: (query) => {
      setFollowing(false);
      return check(query);
    },
    following,
    setFollowing,
    lastFlightAttempt: lastAttempt,
  };
}
const localTime = (iso, offset) =>
  iso
    ? new Date(
        Date.parse(iso) +
          (offset[0] === "-" ? -1 : 1) *
            (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(3))) *
            60000,
      )
        .toISOString()
        .slice(11, 16)
    : "Pending";
export function LiveFlightLookup() {
  const { lookup, checkFlight, following, setFollowing, lastFlightAttempt } =
    useJourney();
  const [number, setNumber] = useState("CX383"),
    [date, setDate] = useState(hkgDate);
  const [error, setError] = useState(null),
    [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const cooling = now - lastFlightAttempt.current < 30000;
  return (
    <section
      className="live-flight-lookup"
      aria-label="Live Cathay flight lookup"
    >
      <div className="section-title">
        <h3>Find a real Cathay flight</h3>
        <Icon name="plane" size={22} />
      </div>
      <p>Choose the flight and its local departure date.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const query = flightQuery(number, date);
            setError(null);
            checkFlight(query);
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <div className="flight-search-fields">
          <label>
            Flight number
            <input
              aria-label="Flight number"
              value={number}
              maxLength={8}
              onChange={(e) => setNumber(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>
          <label>
            Departure date
            <input
              aria-label="Departure date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>
        <button
          className="primary-button"
          disabled={lookup.loading || cooling}
          aria-busy={lookup.loading}
        >
          <Icon
            name="refresh"
            size={16}
            className={lookup.loading ? "busy-icon" : ""}
          />
          {lookup.loading
            ? "Checking your flight…"
            : cooling
              ? "Next check available shortly"
              : "Check flight"}
        </button>
      </form>
      {(error || lookup.error) && (
        <p className="live-error" role="status">
          {error || lookup.error}
          {lookup.result && " Previous result retained below."}
        </p>
      )}
      {lookup.result && (
        <>
          <div className="live-flight-evidence">
            <span className="live-source-tag">
              Cathay Pacific ·{" "}
              {lookup.error
                ? "previous result"
                : flightFreshness(lookup.result, now)}
            </span>
            <small>
              HTTP {lookup.httpStatus} · {lookup.checks}{" "}
              {lookup.checks === 1 ? "check" : "checks"}
            </small>
          </div>
          {!lookup.result.flights.length && (
            <p>
              No flights returned for this date. Try another departure date.
            </p>
          )}
          {lookup.result.flights.map((flight) => {
            const minutes = Math.floor(
              (Date.parse(flight.boarding.boarding) - now) / 60000,
            );
            const complete = [
              "ARRIVED",
              "DEPARTED",
              "CANCELLED",
              "CANCELED",
              "DIVERTED",
            ].includes(flight.status);
            const delayed =
              flight.status.includes("DELAY") ||
              (flight.estimatedDeparture &&
                Date.parse(flight.estimatedDeparture) >
                  Date.parse(flight.scheduledDeparture));
            return (
              <article className="live-flight-result" key={flight.id}>
                <header>
                  <strong>
                    {flight.number} · {flight.origin} → {flight.destination}
                  </strong>
                  <span>
                    {flight.status.replaceAll("_", " ").toLowerCase()}
                  </span>
                </header>
                <div className="live-flight-times">
                  <div>
                    <small>Scheduled departure</small>
                    <strong>
                      {localTime(
                        flight.scheduledDeparture,
                        flight.departureOffset,
                      )}
                    </strong>
                    <small>
                      {flight.departureLocal.slice(0, 10)} · {flight.origin}{" "}
                      local
                    </small>
                  </div>
                  <div>
                    <small>Scheduled arrival</small>
                    <strong>
                      {localTime(flight.scheduledArrival, flight.arrivalOffset)}
                    </strong>
                    <small>
                      {flight.arrivalLocal.slice(0, 10)} · {flight.destination}{" "}
                      local
                    </small>
                  </div>
                </div>
                <p>
                  Terminal {flight.terminal || "pending"} · Gate{" "}
                  {flight.gate || "pending"}
                </p>
                <p>
                  {flight.actualDeparture ? "Actual" : "Estimated"} departure{" "}
                  {localTime(
                    flight.actualDeparture || flight.estimatedDeparture,
                    flight.actualDeparture
                      ? flight.actualDepartureOffset
                      : flight.estimatedDepartureOffset,
                  )}{" "}
                  · {flight.actualArrival ? "Actual" : "Estimated"} arrival{" "}
                  {localTime(
                    flight.actualArrival || flight.estimatedArrival,
                    flight.actualArrival
                      ? flight.actualArrivalOffset
                      : flight.estimatedArrivalOffset,
                  )}
                </p>
                {!complete && (
                  <div className="included-note">
                    <Icon name="clock" size={18} />
                    <span>
                      <strong>
                        Estimated boarding{" "}
                        {localTime(
                          flight.boarding.boarding,
                          flight.departureOffset,
                        )}
                      </strong>
                      <br />
                      {delayed
                        ? "Flight timing has changed; extra activity time is not assumed."
                        : minutes > 0
                          ? `${minutes} min until estimated boarding`
                          : "Estimated boarding time reached; check airport displays."}
                      <small>
                        Estimated boarding: 40 min before scheduled departure.
                      </small>
                    </span>
                  </div>
                )}
              </article>
            );
          })}
          <p className="subtle small">
            Source updated{" "}
            {new Date(lookup.result.updatedAt).toLocaleTimeString("en-GB", {
              timeZone: "Asia/Hong_Kong",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            HKT. These live results stay separate from your simulated booking.
          </p>
          <label className="toggle-row">
            <span>
              Keep checking this flight
              <small>
                Every minute while the app is active, including after closing
                this panel.
              </small>
            </span>
            <input
              type="checkbox"
              checked={following}
              onChange={(e) => setFollowing(e.target.checked)}
            />
          </label>
        </>
      )}
      <p className="subtle small">
        <a href={FLIGHT_SOURCE.page} target="_blank" rel="noreferrer">
          Cathay flight status
        </a>{" "}
        · Experimental connection to the public website service.
      </p>
    </section>
  );
}
