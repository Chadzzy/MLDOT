import { boardingContext, weatherContext } from "./journey-context.js";
import {
  PassLockup,
  PassBenefits,
  PassCodeArtwork,
} from "./ReferenceArtwork.jsx";
import { useJourney } from "./context.js";
import { Icon, Wing } from "./icons.jsx";
import { time, date, fullDate, liveActivity, displayFlight } from "./model.js";
import { SCENARIOS } from "./data.js";

export function SourceLabel({ children = "Journey information" }) {
  return (
    <span className="source-label">
      <span />
      {children}
    </span>
  );
}
export function ModuleRow({ icon, title, subtitle, onClick, children }) {
  return (
    <button className="module-row" onClick={onClick}>
      <span className="row-icon">
        <Icon name={icon} />
      </span>
      <span className="row-copy">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
        {children}
      </span>
      <Icon name="chevron" size={18} />
    </button>
  );
}
export function FlightRoute({ flight, compact = false }) {
  return (
    <div className={`flight-route ${compact ? "compact" : ""}`}>
      <div>
        <small>{flight.originName}</small>
        <strong>{flight.origin}</strong>
        <b>{time(flight.departure, flight.originZone)}</b>
        <small>
          {flight.terminal ? `Terminal ${flight.terminal}` : "Terminal pending"}
        </small>
      </div>
      <div className={`route-line ${flight.via ? "has-connection" : ""}`}>
        <small>{flight.duration}</small>
        <span>
          <Icon name="plane" size={26} />
        </span>
        <small>{flight.via ? `via ${flight.via}` : "Direct"}</small>
      </div>
      <div>
        <small>{flight.destinationName}</small>
        <strong>{flight.destination}</strong>
        <b>{time(flight.arrival, flight.destinationZone)}</b>
        <small>
          {flight.destinationTerminal
            ? `Terminal ${flight.destinationTerminal}`
            : "Terminal pending"}
        </small>
      </div>
    </div>
  );
}
export function FlightCard() {
  const { journey, open } = useJourney();
  const f = displayFlight(journey);
  return (
    <button
      className="flight-card"
      onClick={() => open("flight")}
      aria-label="View flight details"
    >
      <div className="flight-card-top">
        <span>
          {fullDate(f.departure)} <span className="divider">|</span> {f.number}
        </span>
        <span className="soft-tag">
          {journey.recovery
            ? "Updated journey"
            : journey.phase === "arrived"
              ? "Arrived"
              : journey.phase === "inflight"
                ? "In flight"
                : journey.isDisrupted
                  ? "Cancelled"
                  : journey.isUncertain
                    ? "Delayed"
                    : "Leisure travel"}
        </span>
      </div>
      <h3>
        {f.originName} to {f.destinationName}
      </h3>
      <FlightRoute flight={f} />
    </button>
  );
}

function DemoCode() {
  return (
    <div className="demo-code">
      <PassCodeArtwork />
    </div>
  );
}
export function PassCard() {
  const { journey } = useJourney();
  const f = journey.flight;
  const invalid = journey.passState !== "demo";
  return (
    <article
      className={`boarding-pass ${invalid ? "invalid-pass" : ""} ${journey.passState === "used" ? "used-pass" : ""}`}
    >
      <div className="pass-brand">
        <span>
          <PassLockup />
        </span>
        <span>
          {f.number}
          <small>{date(f.departure)}</small>
        </span>
      </div>
      <div className="pass-route">
        <div>
          <small>{f.originName}</small>
          <strong>{f.origin}</strong>
          <b>{time(f.departure)}</b>
        </div>
        <Icon name="plane" size={32} />
        <div>
          <small>{f.destinationName}</small>
          <strong>{f.destination}</strong>
          <b>{time(f.arrival, f.destinationZone)}</b>
        </div>
      </div>
      <div className="pass-content">
        <div className="pass-name">
          {journey.passenger.name}
          <span>{f.cabin}</span>
        </div>
        <div className="pass-perks">
          <PassBenefits />
        </div>
        <div className="pass-fields">
          {[
            ["Boarding", time(f.boarding)],
            ["Terminal", f.terminal],
            ["Gate", f.gate],
            ["Group", f.group],
            ["Seat", f.seat],
          ].map(([k, v]) => (
            <div key={k}>
              <small>{k}</small>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        {invalid ? (
          <div className="pass-invalid">
            <Icon
              name={journey.passState === "used" ? "circleCheck" : "alert"}
            />
            <strong>
              {journey.passState === "used"
                ? "Boarding is complete"
                : journey.recovery
                  ? "Original pass superseded"
                  : "This flight is cancelled"}
            </strong>
            <p>
              {journey.passState === "used"
                ? "Your itinerary remains available throughout your journey."
                : journey.recovery
                  ? "Your replacement boarding pass is pending."
                  : "Open recovery options to choose your next step."}
            </p>
          </div>
        ) : (
          <>
            <div className="pass-cabin" aria-label={f.cabin}>
              <span>{f.cabin}</span>
            </div>
            <DemoCode />
            <div className="pass-sequence">SEC: 108</div>
          </>
        )}
      </div>
    </article>
  );
}

export function TimingNote({ activity = false }) {
  const { journey } = useJourney();
  const timing = boardingContext(journey);
  if (timing.kind === "finished") return null;
  return (
    <div className={`timing-note timing-${timing.kind}`}>
      <Icon name="clock" size={18} />
      <div>
        <strong>{timing.label}</strong>
        {activity && timing.availableMinutes > 0 && (
          <p>
            Up to {timing.availableMinutes} min for a flexible stop · leave by{" "}
            {time(timing.leaveBy)} HKT.
          </p>
        )}
        <small>{timing.detail}</small>
      </div>
    </div>
  );
}

export function WeatherWatch({ full = false }) {
  const { journey, open } = useJourney();
  const weather = weatherContext(journey);
  if (
    !weather ||
    journey.recovery ||
    journey.isDisrupted ||
    ["inflight", "arrived"].includes(journey.phase)
  )
    return null;
  return (
    <div className={`weather-watch weather-${weather.stage}`}>
      <button onClick={() => open("weather")} disabled={full}>
        <Icon name="cloud" size={20} />
        <span>
          <strong>{weather.title}</strong>
          <small>{weather.detail}</small>
        </span>
        {!full && <Icon name="chevron" size={17} />}
      </button>
      <small>
        {weather.source} · update {time(weather.at)} HKT
      </small>
      {full && (
        <ol className="weather-progression" aria-label="Weather escalation">
          {[
            ["watch", "Warning issued", "Flight unchanged"],
            ["worsening", "Conditions worsen", "Stay near the gate"],
            ["impact", "Flight impact confirmed", "Revised times pending"],
          ].map(([stage, title, detail]) => (
            <li
              key={stage}
              aria-current={weather.stage === stage ? "step" : undefined}
            >
              <strong>{title}</strong>
              <small>{detail}</small>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function NextAction() {
  const { journey, open } = useJourney();
  return (
    <button className="next-action" onClick={() => open(journey.nextModal)}>
      <span className="action-round">
        <Icon name={journey.nextIcon} />
      </span>
      <span>
        <small>
          Next at{" "}
          <b>
            {time(
              journey.clock,
              journey.phase === "arrived"
                ? journey.flight.destinationZone
                : journey.flight.originZone,
            )}
          </b>{" "}
          · now
        </small>
        <strong>{journey.nextTitle}</strong>
        <p>{journey.nextDetail}</p>
      </span>
      <Icon name="chevron" size={17} />
    </button>
  );
}

export function ActivityPreview({ compact = false }) {
  const { journey, open } = useJourney();
  const a = liveActivity(journey);
  const f = displayFlight(journey);
  const changedGate = journey.activeScenario === "gate";
  const status = journey.recovery
    ? "Updated"
    : journey.isDisrupted
      ? "Cancelled"
      : journey.isUncertain
        ? "Delayed"
        : "On time";
  return (
    <div
      className={`activity-preview reference-activity ${compact ? "compact-activity" : ""}`}
    >
      <div className="reference-activity-top">
        <Wing />
        <span>{f.number}</span>
      </div>
      <div className="reference-activity-route">
        <div>
          <span>
            <b>{f.origin}</b> {time(f.departure, f.originZone)}
          </span>
          <small>
            {f.terminal ? `Terminal ${f.terminal}` : "Terminal pending"}
          </small>
        </div>
        <div className="activity-route-track">
          <strong>{status}</strong>
          <span>
            <Icon name="plane" size={19} />
          </span>
        </div>
        <div>
          <span>
            <b>{f.destination}</b> {time(f.arrival, f.destinationZone)}
          </span>
          <small>
            {f.destinationTerminal
              ? `Terminal ${f.destinationTerminal}`
              : "Terminal pending"}
          </small>
        </div>
      </div>
      <button
        className="reference-activity-action"
        onClick={() => open(journey.nextModal)}
        aria-label="Open journey from Live Activity"
      >
        <span>
          {changedGate ? (
            <>
              <b>Boarding gate</b> has changed
            </>
          ) : journey.isDisrupted ||
            journey.isUncertain ||
            journey.connection ? (
            <>
              <b>{a.title}</b>
              <small>
                {a.label} · {a.value}
              </small>
            </>
          ) : (
            <>
              <b>Boarding</b> at {time(f.boarding)}
            </>
          )}
        </span>
        <span className="activity-action-badge">
          <Icon name={a.icon} size={16} />
          {journey.isDisrupted || journey.isUncertain ? (
            <Icon name="chevron" size={16} />
          ) : (
            f.gate
          )}
        </span>
      </button>
    </div>
  );
}

export function ScenarioControls() {
  const { state, dispatch, evidence, refreshing, refresh } = useJourney();
  return (
    <>
      <div className="scenario-list">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={`scenario-button ${state.scenario === s.id ? "selected" : ""}`}
            onClick={() => dispatch({ type: "SCENARIO", value: s.id })}
            aria-pressed={state.scenario === s.id}
          >
            <span className={`scenario-icon ${s.id}`}>
              <Icon name={s.icon} size={18} />
            </span>
            <span>
              <strong>{s.label}</strong>
              <small>{s.description}</small>
            </span>
            {state.scenario === s.id && <Icon name="check" size={16} />}
          </button>
        ))}
      </div>
      <button
        className="text-button reset-button"
        onClick={() => dispatch({ type: "RESET" })}
      >
        <Icon name="refresh" size={16} /> Reset journey{" "}
        <span>Saved choices stay</span>
      </button>
      <div className="evidence-card">
        <span className="eyebrow">DATA SOURCE</span>
        <strong>
          <span className="status-dot" />
          Local demo adapter
        </strong>
        <p>
          Flights, weather and events are sample data. No live integrations are
          connected.
        </p>
        <div className="evidence-metrics">
          <span>External API calls</span>
          <b>{evidence?.networkRequests ?? 0}</b>
        </div>
        <button className="text-button" onClick={refresh} disabled={refreshing}>
          <Icon name="refresh" size={14} />
          {refreshing ? "Loading sample…" : "Reload sample data"}
        </button>
      </div>
    </>
  );
}

export function RecoveryOption({ option, best, onSelect }) {
  return (
    <article className={`recovery-option ${best ? "best-option" : ""}`}>
      <div className="option-top">
        <span className={best ? "best-label" : "eyebrow"}>
          {best ? "BEST MATCH FOR YOUR PRIORITY" : option.title}
        </span>
        <span className="small-tag">Alternative flight</span>
      </div>
      <h3>{option.airline}</h3>
      <div className="option-route">
        <div>
          <strong>HKG</strong>
          <b>{time(option.departure)}</b>
          <small>{date(option.departure)}</small>
        </div>
        <div>
          <Icon name="plane" />
          <small>
            {option.via ? `via ${option.via}` : "Direct"} · {option.duration}
          </small>
        </div>
        <div>
          <strong>ZRH</strong>
          <b>{time(option.arrival, "Europe/Zurich")}</b>
          <small>{date(option.arrival, "Europe/Zurich")}</small>
        </div>
      </div>
      <span className={`cabin-label ${option.business ? "" : "mixed"}`}>
        <Icon name={option.business ? "check" : "info"} size={15} />
        {option.cabin}
      </span>
      <p>{option.note}</p>
      <details>
        <summary>View individual legs</summary>
        {option.legs.map((l) => (
          <div className="leg-detail" key={l}>
            <Icon name="plane" size={14} />
            {l}
          </div>
        ))}
      </details>
      {onSelect && (
        <button
          className={best ? "primary-button" : "secondary-button"}
          onClick={() => onSelect(option)}
        >
          Choose this option
          <Icon name="arrow" size={16} />
        </button>
      )}
    </article>
  );
}
