import {
  boardingContext,
  readinessContext,
  weatherContext,
} from "./journey-context.js";
import {
  NATIVE_MODE,
  requestNativePriorities,
  saveNativePreferences,
} from "./native-simulation.js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useJourney } from "./context.js";
import { Icon } from "./icons.jsx";
import {
  SourceLabel,
  TimingNote,
  WeatherWatch,
  PassCard,
  ModuleRow,
  FlightRoute,
  RecoveryOption,
  ScenarioControls,
  ActivityPreview,
} from "./components.jsx";
import { CATALOGUE } from "./data.js";
import {
  time,
  date,
  fullDate,
  rankRecovery,
  entertainmentMinutes,
  displayFlight,
} from "./model.js";
import directory from "./venue-directory.json";
import { LiveSources, LiveWeatherCard, LiveWarningWatch } from "./LiveData.jsx";
import { loungeAccess } from "./lounge-rules.js";

export const MODAL_TITLES = {
  live: "Live data connections",
  transport: "Getting to the airport",
  connection: "Your connection",
  pass: "Your boarding pass",
  flight: "Your flight",
  weather: "Your journey outlook",
  entertainment: "Plan your flight",
  places: "Make yourself at home",
  lounge: "Your Cathay lounges",
  "lounge-directions": "Directions to The Pier, First",
  directions: "Find your way",
  readiness: "Your aircraft",
  recovery: "Journey recovery",
  rest: "Arrive in your own rhythm",
  documents: "Before you travel",
  share: "Let someone follow along",
  profile: "Your preferences",
  notifications: "Journey updates",
  research: "Demo controls",
  activity: "Live Activity preview",
  seat: "Your seat",
  upgrade: "Your cabin",
  explore: "A little inspiration",
};

function Weather() {
  const { journey } = useJourney();
  const flight = displayFlight(journey);
  const weather = weatherContext(journey);
  const segments = [
    ...(journey.connection
      ? [
          {
            route: "Bangkok",
            to: "Hong Kong",
            number: journey.connection.inboundNumber,
            schedule: `27 Oct · Arrived ${time(journey.connection.arrival)}`,
            airports: [
              {
                code: "BKK",
                icon: "cloud",
                description: "Heavy showers",
                high: 34,
                low: 27,
                note: true,
              },
              {
                code: "HKG",
                icon: "cloud",
                description:
                  weather?.stage === "impact" || weather?.stage === "worsening"
                    ? "Thunderstorms"
                    : weather?.stage === "watch"
                      ? "Thunderstorm warning"
                      : "Partly cloudy",
                high: 29,
                low: 26,
              },
            ],
          },
        ]
      : []),
    {
      route: flight.originName,
      to: flight.destinationName,
      number: flight.number,
      schedule: `${date(flight.departure)} · ${time(flight.departure)}–${time(flight.arrival, flight.destinationZone)}${flight.via ? ` · via ${flight.via}` : ""}`,
      airports: [
        {
          code: "HKG",
          icon: "cloud",
          description:
            weather?.stage === "impact" || weather?.stage === "worsening"
              ? "Thunderstorms"
              : weather?.stage === "watch"
                ? "Thunderstorm warning"
                : "Partly cloudy",
          high: 29,
          low: 26,
        },
        { code: "ZRH", icon: "sun", description: "Sunny", high: 27, low: 13 },
      ],
    },
  ];
  return (
    <>
      <h2 className="weather-heading-title">
        Here’s the outlook for your upcoming{" "}
        {segments.length > 1 ? "flights" : "flight"} to Zurich
      </h2>
      {journey.isDisrupted && !journey.recovery && (
        <div className="inline-warning">
          <Icon name="info" />
          <p>
            Your original flight is cancelled. This outlook refers to the
            original itinerary until you choose a recovery.
          </p>
        </div>
      )}
      <WeatherWatch full />
      <LiveWarningWatch controls />
      <LiveWeatherCard />
      {segments.map((segment) => (
        <div className="weather-segment" key={segment.number}>
          <div className="weather-route">
            <strong>
              {segment.route}
              <Icon name="plane" size={16} />
              {segment.to}
            </strong>
            <small>
              <Icon name="plane" size={13} />
              {segment.number} <span> | </span>
              {segment.schedule}
            </small>
          </div>
          {segment.airports.map((w) => (
            <div className="weather-card" key={w.code}>
              <div className="weather-line">
                <b>{w.code}</b>
                <Icon name={w.icon} size={20} />
                <span>
                  {w.description}
                  {w.note && <i className="weather-alert-dot" />}
                </span>
                <strong>
                  {w.high}°<small>{w.low}°</small>
                </strong>
              </div>
              {w.note && (
                <p>
                  We’re monitoring the situation closely. If it changes anything
                  about your flight, you’ll hear it here first.
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
      <p className="weather-source">Illustrative weather · scenario data</p>
    </>
  );
}

function Connection() {
  const { journey, open } = useJourney();
  const connection = journey.connection;
  if (!connection)
    return (
      <>
        <h2>Your connection</h2>
        <p>
          This journey starts in Hong Kong. Choose the connection trigger to
          explore a transfer.
        </p>
      </>
    );
  return (
    <>
      <h2>Your connection in Hong Kong</h2>
      <div className="connection-card">
        <p>Your connection time has been affected by the delay.</p>
        <h3>
          After landing in Hong Kong, head straight to{" "}
          <span style={{ color: "#367f83" }}>Gate {journey.flight.gate}.</span>
        </h3>
        <p>
          Follow the transfer signs and check with the gate team when you
          arrive.
        </p>
        <div className="connection-count">
          <b>{connection.minutes} mins</b> until gate closes
        </div>
        <div className="connection-gates">
          <span>
            <strong>Gate {connection.arrivalGate}</strong>
            <small>Arrived at {time(connection.arrival)}</small>
          </span>
          <span>
            <strong>Gate {journey.flight.gate}</strong>
            <small>Gate closes at {time(journey.flight.cutoff)}</small>
          </span>
        </div>
      </div>
      <ModuleRow
        icon="ticket"
        title={`${journey.flight.number} to ${journey.flight.destinationName}`}
        subtitle={`Boarding at ${time(journey.flight.boarding)} · Gate ${journey.flight.gate}`}
        onClick={() => open("pass")}
      />
      <button className="primary-button" onClick={() => open("share")}>
        Let someone follow your journey
      </button>
      <p className="subtle small">
        Illustrative arrival and gates. Allow for disembarkation, transfer
        checks and movement between gates; the countdown does not verify that
        the connection is achievable.
      </p>
    </>
  );
}

function Transport() {
  const { open } = useJourney();
  return (
    <>
      <h2>Head to the airport</h2>
      <p className="intro">
        Your next stop is Hong Kong International Airport, Terminal 1.
      </p>
      <div className="white-card">
        <span className="mini-eyebrow">YOUR JOURNEY TO HKIA</span>
        <h3>Leave at 22:10 · Arrive around 22:55</h3>
        <p>By car · 45 minutes in this scenario</p>
      </div>
      <div className="gentle-note">
        <Icon name="ticket" />
        <p>
          Your boarding pass is ready. Keep time for bag drop, security and the
          journey to your gate.
        </p>
      </div>
      <ModuleRow
        icon="ticket"
        title="Your boarding pass"
        onClick={() => open("pass")}
      />
      <ModuleRow
        icon="clock"
        title="Check Airport Express departures"
        subtitle="Call MTR for current trains from Hong Kong station"
        onClick={() => open("live")}
      />
      <p className="subtle small">
        The car journey is illustrated, with no location or traffic service
        connected. Live trains use the current time, independently of the
        scenario clock.
      </p>
    </>
  );
}

function Entertainment() {
  const { state, dispatch, toast } = useJourney();
  const [tab, setTab] = useState("music");
  const moods = [
    ["unwind", "Unwind"],
    ["discover", "Discover"],
    ["focus", "Focus"],
    ["rest", "Rest"],
  ];
  const ordered =
    tab === "saved"
      ? state.saved.map((id) => CATALOGUE.find((c) => c.id === id))
      : CATALOGUE.filter((c) => c.category === tab).sort(
          (a, b) =>
            Number(b.moods.includes(state.preferences.mood)) -
            Number(a.moods.includes(state.preferences.mood)),
        );
  return (
    <>
      <div className="entertainment-hero">
        <span className="mini-eyebrow">Before you board</span>
        <Icon name="headphones" size={42} />
        <h2>Choose your music & movies</h2>
        <p>About 5 minutes to choose. Enjoy your selections on board.</p>
      </div>
      <TimingNote />
      <div className="field-label">What are you in the mood for?</div>
      <div className="chip-group">
        {moods.map(([id, label]) => (
          <button
            key={id}
            className={`chip ${state.preferences.mood === id ? "active" : ""}`}
            onClick={() =>
              dispatch({ type: "PREFERENCE", key: "mood", value: id })
            }
            aria-pressed={state.preferences.mood === id}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="segmented-tabs"
        role="tablist"
        aria-label="Entertainment categories"
      >
        {[
          ["music", "Listen"],
          ["watch", "Watch"],
          ["saved", `Saved (${state.saved.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="subtle small">
        {tab === "saved"
          ? `${entertainmentMinutes(state.saved)} minutes selected · saved on this device`
          : "A sample collection to help you plan. Onboard availability is not verified."}
      </p>
      <div className="media-list">
        {ordered.map((item, index) => {
          const saved = state.saved.includes(item.id);
          return (
            <article key={item.id} className="media-item">
              <div className={`cover ${item.style}`}>
                <Icon name={item.icon} size={25} />
                <span>{item.category === "music" ? "LISTEN" : "WATCH"}</span>
              </div>
              <div className="media-info">
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
                <small>
                  {item.duration} min
                  {item.moods.includes(state.preferences.mood) &&
                  tab !== "saved"
                    ? " · For your mood"
                    : ""}
                </small>
                {tab === "saved" && (
                  <div className="queue-actions">
                    <button
                      aria-label={`Move ${item.title} up`}
                      disabled={index === 0}
                      onClick={() =>
                        dispatch({ type: "MOVE", id: item.id, direction: -1 })
                      }
                    >
                      <Icon name="up" size={16} />
                    </button>
                    <button
                      aria-label={`Move ${item.title} down`}
                      disabled={index === ordered.length - 1}
                      onClick={() =>
                        dispatch({ type: "MOVE", id: item.id, direction: 1 })
                      }
                    >
                      <Icon name="down" size={16} />
                    </button>
                  </div>
                )}
              </div>
              <button
                className={`save-button ${saved ? "saved" : ""}`}
                aria-label={`${saved ? "Remove" : "Save"} ${item.title}`}
                aria-pressed={saved}
                onClick={() => {
                  dispatch({ type: "SAVE", id: item.id });
                  toast(
                    saved
                      ? "Removed from your flight plan"
                      : "Saved for your flight",
                  );
                }}
              >
                <Icon name={saved ? "check" : "plus"} size={20} />
              </button>
            </article>
          );
        })}
      </div>
      {ordered.length === 0 && (
        <div className="empty-state">
          <Icon name="heart" size={35} />
          <h3>Your flight, your favourites</h3>
          <p>Save something from Listen or Watch. It will be waiting here.</p>
        </div>
      )}
      <div className="gentle-note">
        <Icon name="info" size={18} />
        <p>
          Selections are saved, not downloaded. Use your streaming app for
          playback and offline downloads. No media account is connected.
        </p>
      </div>
    </>
  );
}

function Places() {
  const { open, state, dispatch, journey, assets } = useJourney();
  return (
    <>
      <SourceLabel>Venue directory in progress</SourceLabel>
      <h2>
        Make the most
        <br />
        of your airport time
      </h2>
      <p className="intro">A space to unwind. A moment for yourself.</p>
      <TimingNote activity />
      {journey.isUncertain && (
        <div className="inline-warning">
          <Icon name="clock" />
          <p>
            Your departure time is unconfirmed. Stay nearby and choose flexible
            activities.
          </p>
        </div>
      )}
      {!journey.isDisrupted && (
        <button className="lounge-image-card" onClick={() => open("lounge")}>
          {assets.lounge && <img src={assets.lounge} alt="Cathay lounge" />}
          <div>
            <span>CATHAY LOUNGES</span>
            <h3>Find your quiet corner</h3>
            <p>
              The Pier, First · Access included <Icon name="arrow" size={16} />
            </p>
          </div>
        </button>
      )}
      <ModuleRow
        icon="headphones"
        title="Choose your onboard soundtrack"
        subtitle="Make your entertainment plan"
        onClick={() => open("entertainment")}
      />
      <div className="directory-note">
        <Icon name="coffee" size={25} />
        <div>
          <strong>Restaurants & shops, thoughtfully selected</strong>
          <p>
            We’re building a small directory from official information. Verified
            venues will appear here; no opening hours or availability are
            assumed.
          </p>
        </div>
      </div>
    </>
  );
}

function Lounges() {
  const { journey, assets, open } = useJourney();
  const profile =
    journey.passenger.status === "Diamond"
      ? "diamond"
      : journey.flight.cabin === "Business"
        ? "business"
        : "economy";
  const venues = directory.venues.filter(
    (v) => loungeAccess(v, profile).kind === "eligible",
  );
  const [selected, setSelected] = useState("cathay-pier-first");
  const venue = venues.find((v) => v.id === selected) || venues[0];
  if (journey.isDisrupted)
    return (
      <>
        <h2>Your lounge access</h2>
        <p>
          We’ll check access against your revised flight once the recovery is
          confirmed. Your original lounge entitlement is not confirmation for
          the new itinerary.
        </p>
      </>
    );
  if (!venue)
    return (
      <>
        <h2>Your lounge access</h2>
        <p>There is no included lounge for this travel profile.</p>
      </>
    );
  const pierFirst = venue.id === "cathay-pier-first";
  const timing = boardingContext(journey);
  return (
    <>
      {pierFirst && (
        <img
          className="lounge-cover"
          src={assets.lounge}
          alt="The Bar at The Pier, First"
        />
      )}
      <h2>{venue.name}</h2>
      <p className="intro">{venue.locationText}</p>
      <TimingNote activity />
      <div className="included-note">
        <Icon name="circleCheck" size={20} />
        Access included with your{" "}
        {profile === "diamond" ? "Diamond membership" : "Business Class ticket"}
      </div>
      {pierFirst && (
        <>
          <p>
            {timing.availableMinutes > 0
              ? "Choose a short meal or a moment to rest within your available time. Treatment duration and availability need confirmation at the lounge."
              : "Keep close to your gate for now. Your included lounge facilities are listed below for reference."}
          </p>
          <div className="lounge-highlights">
            <div>
              <Icon name="coffee" />
              <span>À la carte dining and refreshments</span>
            </div>
            <div>
              <Icon name="moon" />
              <span>Private day suites at The Retreat</span>
            </div>
            <div>
              <Icon name="leaf" />
              <span>Complimentary foot massage, subject to availability</span>
            </div>
          </div>
          <button
            className="primary-button"
            onClick={() => open("lounge-directions")}
          >
            Get Directions <Icon name="arrow" size={18} />
          </button>
        </>
      )}
      <div className="venue-details">
        <dl>
          <div>
            <dt>Opening hours</dt>
            <dd>{venue.hours}</dd>
          </div>
        </dl>
        {venue.notices.map((notice, i) => (
          <div className="venue-current-notice" key={i}>
            <Icon name="info" size={16} />
            <p>{notice.summary}</p>
          </div>
        ))}
        <details>
          <summary>Lounge information</summary>
          <p className="small">
            Published venue information, checked 26 Oct 2026. Opening, capacity
            and treatments are not confirmed live.
          </p>
          <a
            className="text-button"
            href={venue.officialSourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Official lounge page <Icon name="external" size={14} />
          </a>
        </details>
      </div>
      <details className="lounge-list">
        <summary>Your other Cathay lounges</summary>
        {venues.map((v) => (
          <button
            key={v.id}
            className={`lounge-row ${venue.id === v.id ? "selected" : ""}`}
            onClick={() => setSelected(v.id)}
            aria-pressed={venue.id === v.id}
          >
            <span>
              <strong>{v.name}</strong>
              <small>
                Terminal {v.terminal} · near Gate {v.nearestGate}
              </small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        ))}
      </details>
    </>
  );
}

function LoungeDirections() {
  return (
    <>
      <h2>
        Your next stop:
        <br />
        The Pier, First
      </h2>
      <p className="intro">Terminal 1 · Level 6 · Near Gate 63</p>
      <TimingNote activity />
      <div className="included-note">
        <Icon name="pin" />
        <span>
          Follow airport signs towards Gate 63, then The Pier, First on Level 6.
        </span>
      </div>
      <div className="gate-map" aria-label="Illustrative lounge location">
        <svg viewBox="0 0 327 187" role="img">
          <rect width="327" height="187" rx="15" fill="#f3f3f1" />
          <path
            d="M35 135H160V65H280"
            stroke="#367f83"
            strokeWidth="3"
            strokeDasharray="2 8"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="160" cy="65" r="8" fill="#005e63" />
          <text x="30" y="160" fontSize="12" fill="#666">
            Departure concourse
          </text>
          <text x="180" y="40" fontSize="13" fill="#005e63">
            The Pier, First
          </text>
          <text x="180" y="100" fontSize="12" fill="#666">
            Near Gate 63
          </text>
        </svg>
      </div>
      <p className="subtle small">
        Illustrative location, not a live indoor route. Follow airport signage
        for the accessible route and level changes.
      </p>
    </>
  );
}

function Directions() {
  const { journey, state, dispatch } = useJourney();
  const routes = {
    "Gate 40": { path: "M60 180V103h213V72", x: 60, y: 180 },
    "Lounge entrance": { path: "M170 180V103h103V72", x: 170, y: 180 },
    "Security exit": { path: "M30 80V103h243V72", x: 30, y: 80 },
  };
  const route = routes[state.preferences.location];
  return (
    <>
      <SourceLabel>Illustrative route · not live navigation</SourceLabel>
      <h2>
        Your next stop:
        <br />
        Gate {journey.flight.gate}
      </h2>
      <label className="field-label" htmlFor="origin-location">
        Starting from
      </label>
      <select
        id="origin-location"
        value={state.preferences.location}
        onChange={(e) =>
          dispatch({
            type: "PREFERENCE",
            key: "location",
            value: e.target.value,
          })
        }
      >
        {["Gate 40", "Lounge entrance", "Security exit"].map((l) => (
          <option key={l}>{l}</option>
        ))}
      </select>
      <div className="airport-map">
        <svg
          viewBox="0 0 340 230"
          role="img"
          aria-label={`Schematic sample route from ${state.preferences.location} to Gate ${journey.flight.gate}`}
        >
          <rect width="340" height="230" rx="18" fill="#f0f1ed" />
          <g fill="#e0e4df">
            <rect x="18" y="18" width="70" height="50" rx="12" />
            <rect x="130" y="20" width="110" height="40" rx="10" />
            <rect x="260" y="15" width="60" height="65" rx="12" />
            <rect x="130" y="150" width="85" height="65" rx="12" />
          </g>
          <path
            d={route.path}
            fill="none"
            stroke="#317d7d"
            strokeWidth="5"
            strokeDasharray="2 12"
            strokeLinecap="round"
          />
          <circle
            cx={route.x}
            cy={route.y}
            r="10"
            fill="#fff"
            stroke="#317d7d"
            strokeWidth="4"
          />
          <circle cx="273" cy="72" r="10" fill="#9e850f" />
          <text x="44" y="212" fontSize="12" fill="#344d49">
            {state.preferences.location}
          </text>
          <text x="226" y="44" fontSize="14" fontWeight="600" fill="#455347">
            Gate {journey.flight.gate}
          </text>
        </svg>
      </div>
      <div className="white-card">
        <h3>
          <Icon name="map" />
          How to get there
        </h3>
        {[
          [
            "arrow",
            "Follow the departure-gates signs",
            "Start from your selected landmark.",
          ],
          [
            "arrow",
            "Continue along the concourse",
            `Follow airport signs towards Gate ${journey.flight.gate}.`,
          ],
          [
            "pin",
            `Check the display at Gate ${journey.flight.gate}`,
            "Follow staff guidance and the latest boarding information.",
          ],
        ].map(([icon, title, sub]) => (
          <div className="direction-step" key={title}>
            <Icon name={icon} />
            <span>
              <strong>{title}</strong>
              <small>{sub}</small>
            </span>
          </div>
        ))}
      </div>
      <p className="subtle small">
        This diagram tests the navigation experience. It is not an HKIA indoor
        map; distance, walking time and AR guidance are not verified.
      </p>
    </>
  );
}

function Readiness() {
  const { journey } = useJourney();
  const readiness = readinessContext(journey);
  const timing = boardingContext(journey);
  return (
    <>
      <h2>Is my aircraft ready?</h2>
      <p className="readiness-progress">
        Latest scenario update · {time(journey.clock)} HKT
      </p>
      <TimingNote />
      <div className="readiness-list">
        {[
          { title: readiness.title, sub: readiness.detail, active: true },
          {
            title: "Aircraft preparation",
            sub:
              journey.disruptionCause === "weather"
                ? "Preparation updates will appear here as they are confirmed."
                : "We’ll show confirmed preparation updates here.",
          },
          {
            title: "Bags & cargo",
            sub: "Completion time not confirmed. Ground tasks depend on conditions and operational clearance.",
          },
          {
            title: "Crew & final checks",
            sub: "Ready-to-depart clearance and timing are not yet confirmed.",
          },
          { title: "Boarding", sub: timing.label + ". " + timing.detail },
        ].map((step) => (
          <div
            key={step.title}
            className={`readiness-item ${step.active ? "active" : ""}`}
          >
            <span className="milestone" />
            <div>
              <h3>{step.title}</h3>
              {step.active && (
                <span className="outline-tag">
                  {journey.isUncertain ? "Awaiting update" : "Monitoring"}
                </span>
              )}
              <p>{step.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="gentle-note">
        <Icon name="info" />
        <p>
          Simulated operational updates. Weather observations alone do not
          confirm an aircraft fault, flight delay or completion time.
        </p>
      </div>
    </>
  );
}

function Recovery() {
  const { state, journey, dispatch, open } = useJourney();
  const [step, setStep] = useState("preferences");
  const [choice, setChoice] = useState(null);
  const [comparing, setComparing] = useState(false);
  const comparisonTimer = useRef(null);
  const [compareError, setCompareError] = useState("");
  const comparisonActive = useRef(true);
  useEffect(() => {
    comparisonActive.current = true;
    return () => {
      comparisonActive.current = false;
      clearTimeout(comparisonTimer.current);
    };
  }, []);
  const compare = async () => {
    setCompareError("");
    setComparing(true);
    if (NATIVE_MODE) {
      const result = await saveNativePreferences(
        state.preferences.recoveryPriority,
        state.preferences.recoveryText,
      );
      if (!comparisonActive.current) return;
      setComparing(false);
      if (result.ok) setStep("options");
      else setCompareError(result.message);
      return;
    }
    comparisonTimer.current = setTimeout(() => {
      setComparing(false);
      setStep("options");
    }, 500);
  };
  const options = rankRecovery(state.preferences.recoveryPriority);
  const contentRef = useRef(null);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const scroll = content.closest(".detail-scroll");
    if (scroll) scroll.scrollTop = 0;
    const heading = content.querySelector("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      content.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 220, easing: "ease-out" },
      );
  }, [step, choice?.id, journey.recovery?.id]);
  function renderStep() {
    if (journey.recovery)
      return (
        <>
          <SourceLabel>Simulated recovery · no ticket issued</SourceLabel>
          <div className="success-circle">
            <Icon name="check" size={34} />
          </div>
          <h2>Your choice is saved.</h2>
          <p className="intro">
            Let’s bring the rest of your journey together.
          </p>
          <RecoveryOption option={journey.recovery} best />
          <div className="confirmation-timeline">
            <p>
              <Icon name="circleCheck" />
              Recovery option selected in demo
            </p>
            <p>
              <Icon name="clock" />
              Airline confirmation simulated; no actual booking
            </p>
            <p>
              <Icon name="ticket" />
              Replacement boarding pass pending
            </p>
          </div>
          <ModuleRow
            icon="shield"
            title="Check the revised travel requirements"
            subtitle="A new transit point can change what you need"
            onClick={() => open("documents")}
          />
          <ModuleRow
            icon="moon"
            title="Revisit your rest plan"
            subtitle="Explore your changed arrival time"
            onClick={() => open("rest")}
          />
          <button
            className="secondary-button"
            onClick={() => {
              dispatch({ type: "SCENARIO", value: "cancelled" });
              setStep("options");
              setChoice(null);
            }}
          >
            Compare options again
          </button>
        </>
      );
    if (!journey.isDisrupted)
      return (
        <>
          <h2>Recovery, when you need it.</h2>
          <p className="intro">
            Your current scenario does not have a cancellation. Use the demo
            controls to explore recovery.
          </p>
          <button className="primary-button" onClick={() => open("research")}>
            Open demo controls
          </button>
        </>
      );
    if (choice)
      return (
        <>
          <SourceLabel>No real booking will be made</SourceLabel>
          <h2>Does this work for you?</h2>
          <div className="white-card">
            <h3>
              {choice.airline} · via {choice.via || "direct flight"}
            </h3>
            <p>{choice.cabin}</p>
            <strong>
              Arrive Zurich · {date(choice.arrival, "Europe/Zurich")},{" "}
              {time(choice.arrival, "Europe/Zurich")}
            </strong>
            <p>{choice.note}</p>
          </div>
          <div className="gentle-note">
            <Icon name="shield" />
            <p>
              {choice.via
                ? `Travel requirements for transit in ${choice.viaName} have not been checked. Baggage arrangements and actual availability are unverified.`
                : "Actual seat availability and ticket exchange eligibility are unverified."}
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => dispatch({ type: "RECOVER", id: choice.id })}
          >
            Confirm demo recovery
            <Icon name="check" size={18} />
          </button>
          <button className="secondary-button" onClick={() => setChoice(null)}>
            Back to options
          </button>
        </>
      );
    return (
      <>
        <div className="step-progress">
          <span className="filled" />
          <span className={step === "options" ? "filled" : ""} />
          <span />
        </div>
        <span className="mini-eyebrow">
          JOURNEY RECOVERY · {step === "preferences" ? "1" : "2"} OF 3
        </span>
        {step === "preferences" ? (
          <>
            <h2>Tell us what matters</h2>
            <p className="intro">
              Your priorities help shape the next part of your journey.
            </p>
            <label className="field-label" htmlFor="recovery-request">
              What would a good recovery look like?
            </label>
            <textarea
              id="recovery-request"
              disabled={comparing}
              maxLength={500}
              rows={5}
              value={state.preferences.recoveryText}
              onChange={(e) =>
                dispatch({
                  type: "PREFERENCE",
                  key: "recoveryText",
                  value: e.target.value,
                })
              }
            />
            {NATIVE_MODE && (
              <button
                className="text-button"
                disabled={comparing}
                onClick={() =>
                  requestNativePriorities(state.preferences.recoveryText)
                }
              >
                Understand my priorities on this iPhone
              </button>
            )}
            <div className="text-counter">
              {state.preferences.recoveryText.length} / 500
            </div>
            <div className="field-label">
              Choose the priority we should rank by
            </div>
            <div className="priority-options">
              {[
                [
                  "business",
                  "Keep Business Class",
                  "Preserve cabin first, then compare arrival times.",
                ],
                [
                  "earliest",
                  "Earliest arrival",
                  "Compare arrival times, including mixed-cabin options.",
                ],
              ].map(([id, title, sub]) => (
                <label key={id}>
                  <input
                    type="radio"
                    name="priority"
                    disabled={comparing}
                    value={id}
                    checked={state.preferences.recoveryPriority === id}
                    onChange={() =>
                      dispatch({
                        type: "PREFERENCE",
                        key: "recoveryPriority",
                        value: id,
                      })
                    }
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{sub}</small>
                  </span>
                </label>
              ))}
            </div>
            <p className="subtle small">
              {NATIVE_MODE
                ? "Your preferences will be saved with this journey. The confirmed priority controls the comparison of demonstration options."
                : "Your note is saved. The selected priority controls ranking in this prototype; no AI interpretation is connected."}
            </p>
            {compareError && (
              <p role="alert" className="live-error">
                {compareError}
              </p>
            )}
            <button
              className="primary-button"
              onClick={compare}
              disabled={comparing}
              aria-busy={comparing}
            >
              {comparing
                ? NATIVE_MODE
                  ? "Saving your priorities…"
                  : "Comparing your options…"
                : "Find my recovery options"}
              <Icon
                name={comparing ? "refresh" : "arrow"}
                className={comparing ? "busy-icon" : ""}
                size={18}
              />
            </button>
          </>
        ) : (
          <>
            <h2>Our best match for you</h2>
            <p className="intro">
              {state.preferences.recoveryPriority === "business"
                ? "Business cabin first, then arrival time."
                : "The earliest arrival first, with cabin trade-offs made clear."}
            </p>
            <SourceLabel>Sample schedules · no live inventory</SourceLabel>
            {options.map((o, i) => (
              <RecoveryOption
                key={o.id}
                option={o}
                best={i === 0}
                onSelect={setChoice}
              />
            ))}
            <button
              className="text-button"
              onClick={() => setStep("preferences")}
            >
              <Icon name="back" size={16} />
              Change my priorities
            </button>
          </>
        )}
      </>
    );
  }
  return (
    <div className="recovery-content" ref={contentRef}>
      {renderStep()}
    </div>
  );
}

function Rest() {
  const { journey, state, open } = useJourney();
  const arrival = journey.recovery?.arrival || journey.flight.arrival;
  return (
    <>
      <SourceLabel>Exploratory rest concept</SourceLabel>
      <TimingNote />
      <div className="rest-hero">
        <Icon name="moon" size={42} />
        <h2>A gentler arrival.</h2>
        <p>Make a little room for yourself along the way.</p>
      </div>
      <div className="world-clocks">
        <div>
          <span>HONG KONG</span>
          <strong>{time(journey.clock)}</strong>
          <small>Your demo clock</small>
        </div>
        <div>
          <span>ZURICH</span>
          <strong>{time(journey.clock, "Europe/Zurich")}</strong>
          <small>Destination time</small>
        </div>
      </div>
      <div className="white-card">
        <span className="mini-eyebrow">YOUR ARRIVAL</span>
        <h3>
          {date(arrival, "Europe/Zurich")} · {time(arrival, "Europe/Zurich")} in
          Zurich
        </h3>
        <p>
          {journey.isDisrupted && !journey.recovery
            ? "Your original flight is cancelled. A new arrival time is pending your recovery choice."
            : journey.isUncertain
              ? "This is the original schedule; your updated arrival is not yet known."
              : journey.recovery
                ? "Based on your selected demo recovery."
                : "Based on the sample itinerary."}
        </p>
      </div>
      <div className="simple-timeline">
        <div>
          <Icon name="coffee" />
          <span>
            <strong>Before boarding</strong>
            <p>
              Find a comfortable place and keep your next travel task in view.
            </p>
          </span>
        </div>
        <div>
          <Icon name="headphones" />
          <span>
            <strong>Once you settle in</strong>
            <p>
              {state.saved.length
                ? `${state.saved.length} entertainment selections are saved. Leave room to rest when you feel ready.`
                : "Choose something you’ll enjoy, with room to rest."}
            </p>
          </span>
        </div>
        <div>
          <Icon name="sun" />
          <span>
            <strong>On arrival</strong>
            <p>
              Use local time to orient yourself and take the first part of the
              day at your own pace.
            </p>
          </span>
        </div>
      </div>
      <button
        className="secondary-button"
        onClick={() => open("entertainment")}
      >
        Choose my listening & watching
        <Icon name="music" size={18} />
      </button>
      <p className="subtle small">
        Jet-lag triggers and personalised sleep schedules are still to be
        designed. This preview gives no timed light-exposure or medical advice.
      </p>
    </>
  );
}

function Documents() {
  const { journey } = useJourney();
  const [checks, setChecks] = useState({
    passport: false,
    booking: !journey.isDisrupted,
    transit: false,
  });
  return (
    <>
      <SourceLabel>Sample checklist · no requirements API</SourceLabel>
      <h2>
        A little preparation.
        <br />
        More peace of mind.
      </h2>
      <p className="intro">Keep track of what you still want to check.</p>
      {journey.recovery?.via && (
        <div className="inline-warning">
          <Icon name="info" />
          <p>
            Your selected route transits {journey.recovery.viaName}.
            Requirements need to be checked for your documents and connection.
          </p>
        </div>
      )}
      {[
        [
          "passport",
          "Passport details",
          "Check expiry and applicable validity requirements.",
        ],
        [
          "booking",
          "Itinerary reviewed",
          "Confirm the dates, airports and operating flights.",
        ],
        [
          "transit",
          "Entry & transit requirements",
          "Check official requirements for your nationality, documents and itinerary.",
        ],
      ].map(([id, title, desc]) => (
        <label className="checklist-row" key={id}>
          <input
            type="checkbox"
            checked={checks[id]}
            onChange={(e) => setChecks({ ...checks, [id]: e.target.checked })}
          />
          <span>
            <strong>{title}</strong>
            <small>{desc}</small>
          </span>
        </label>
      ))}
      <div className="gentle-note">
        <Icon name="shield" />
        <p>
          These are personal checkmarks, not travel clearance. Timatic or
          another requirements service is not connected.
        </p>
      </div>
    </>
  );
}

function SharePreview() {
  const { journey } = useJourney();
  const [times, setTimes] = useState(true);
  const [changes, setChanges] = useState(true);
  return (
    <>
      <SourceLabel>Sharing preview · not published</SourceLabel>
      <h2>
        A little reassurance
        <br />
        for someone at home.
      </h2>
      <p className="intro">Choose what your shared journey would show.</p>
      <label className="toggle-row">
        <span>Flight times and route</span>
        <input
          type="checkbox"
          checked={times}
          onChange={(e) => setTimes(e.target.checked)}
        />
      </label>
      <label className="toggle-row">
        <span>Delays and changes</span>
        <input
          type="checkbox"
          checked={changes}
          onChange={(e) => setChanges(e.target.checked)}
        />
      </label>
      <div className="shared-preview">
        <span className="mini-eyebrow">EMMA’S JOURNEY · PREVIEW</span>
        {times && (
          <>
            <h3>
              Hong Kong <Icon name="plane" size={17} /> Zurich
            </h3>
            <p>
              {journey.recovery
                ? "New arrival"
                : journey.isDisrupted || journey.isUncertain
                  ? "Original scheduled arrival"
                  : "Arrival"}{" "}
              ·{" "}
              {date(
                journey.recovery?.arrival || journey.flight.arrival,
                "Europe/Zurich",
              )}
              ,{" "}
              {time(
                journey.recovery?.arrival || journey.flight.arrival,
                "Europe/Zurich",
              )}
            </p>
          </>
        )}
        {changes && (
          <span className={`status-pill ${journey.tone}`}>
            {journey.status}
          </span>
        )}
        {!times && !changes && <p>No journey details selected.</p>}
      </div>
      <p className="subtle small">
        This demonstrates the recipient’s view. Secure sharing, expiry and
        cross-device updates need a backend; no public link has been created.
      </p>
    </>
  );
}

export function ModalContents({ type }) {
  const { journey, state, open, dispatch } = useJourney();
  switch (type) {
    case "transport":
      return <Transport />;
    case "live":
      return <LiveSources />;
    case "connection":
      return <Connection />;
    case "pass":
      return (
        <>
          <PassCard />
          {journey.isDisrupted && (
            <button className="primary-button" onClick={() => open("recovery")}>
              View recovery options
            </button>
          )}
        </>
      );
    case "flight":
      return (
        <>
          <SourceLabel>Illustrative itinerary</SourceLabel>
          <h2>
            Hong Kong
            <br />
            to Zurich
          </h2>
          <div className="white-card">
            <span>
              {fullDate(displayFlight(journey).departure)} ·{" "}
              {displayFlight(journey).number}
            </span>
            <FlightRoute flight={displayFlight(journey)} />
          </div>
          <ModuleRow
            icon="ticket"
            title="Your boarding pass"
            subtitle={
              journey.isDisrupted
                ? "Original pass unavailable · replacement pending"
                : `${journey.flight.cabin} · Seat ${journey.flight.seat}`
            }
            onClick={() => open("pass")}
          />
          <ModuleRow
            icon="cloud"
            title="Weather along the way"
            onClick={() => open("weather")}
          />
          <ModuleRow
            icon="share"
            title="Share your journey · preview"
            onClick={() => open("share")}
          />
        </>
      );
    case "weather":
      return <Weather />;
    case "entertainment":
      return <Entertainment />;
    case "places":
      return <Places />;
    case "lounge-directions":
      return <LoungeDirections />;
    case "lounge":
      return <Lounges />;
    case "directions":
      return <Directions />;
    case "readiness":
      return <Readiness />;
    case "recovery":
      return <Recovery />;
    case "rest":
      return <Rest />;
    case "documents":
      return <Documents />;
    case "share":
      return <SharePreview />;
    case "research":
      return (
        <>
          <span className="mini-eyebrow">THE JOURNEY WORKBENCH</span>
          <h2>
            Change the situation.
            <br />
            See the response.
          </h2>
          <p className="intro">
            Every scenario uses the same traveller, itinerary and saved
            preferences.
          </p>
          <ScenarioControls />
          <h3 className="section-heading">Lock Screen concept</h3>
          <ActivityPreview />
          <p className="subtle small">
            Web visualisation only. No native iOS Live Activity or APNs
            integration is connected.
          </p>
        </>
      );
    case "activity":
      return (
        <>
          <SourceLabel>Web preview · not native iOS</SourceLabel>
          <h2>
            Your next step,
            <br />
            at a glance.
          </h2>
          <ActivityPreview />
          <p className="intro">
            This preview follows the same scenario as your journey sheet.
          </p>
        </>
      );
    case "profile":
      return (
        <>
          <div className="profile-avatar">EC</div>
          <h2>Emma Chan</h2>
          <p className="intro">Diamond member · fictional demo profile</p>
          <div className="white-card">
            <div className="profile-numbers">
              <div>
                <strong>19,932</strong>
                <small>Asia Miles · demo</small>
              </div>
              <div>
                <strong>600</strong>
                <small>Status points · demo</small>
              </div>
            </div>
          </div>
          <h3>Your airport preferences</h3>
          <label className="toggle-row">
            <span>Somewhere quiet</span>
            <input
              type="checkbox"
              checked={state.preferences.quiet}
              onChange={(e) =>
                dispatch({
                  type: "PREFERENCE",
                  key: "quiet",
                  value: e.target.checked,
                })
              }
            />
          </label>
          <label className="toggle-row">
            <span>Vegetarian options</span>
            <input
              type="checkbox"
              checked={state.preferences.vegetarian}
              onChange={(e) =>
                dispatch({
                  type: "PREFERENCE",
                  key: "vegetarian",
                  value: e.target.checked,
                })
              }
            />
          </label>
          <p className="subtle small">
            Choices stay on this device. No airline or loyalty account is
            connected.
          </p>
        </>
      );
    case "notifications":
      return (
        <>
          <h2>You’re up to date.</h2>
          <div className="notification-item">
            <Icon name={journey.nextIcon} />
            <div>
              <strong>{journey.status}</strong>
              <p>{journey.message}</p>
              <small>Scenario time · {time(journey.clock)} HKT</small>
            </div>
          </div>
          <button
            className="secondary-button"
            onClick={() => open(journey.nextModal)}
          >
            See my next step
          </button>
          <p className="subtle small">
            Demo events only. No push notifications are being sent.
          </p>
        </>
      );
    case "seat":
      return (
        <>
          <h2>A little more space.</h2>
          <div className="seat-display">
            <Icon name="seat" size={64} />
            <strong>{journey.flight.seat}</strong>
            <span>{journey.flight.cabin} · Demo assignment</span>
          </div>
          <p className="intro">
            This sample seat is consistent across your flight details and
            boarding pass.
          </p>
          <button className="secondary-button" onClick={() => open("pass")}>
            View boarding pass
          </button>
        </>
      );
    case "upgrade":
      return (
        <>
          <h2>Your cabin</h2>
          <div className="gold-note">
            <Icon name="seat" />
            <span>
              <strong>{journey.flight.cabin}</strong>
              <small>Sample booking · Seat {journey.flight.seat}</small>
            </span>
          </div>
          <p className="intro">
            Upgrade availability and waiting lists need an airline connection.
            No position or inventory is assumed here.
          </p>
        </>
      );
    case "explore":
      return (
        <>
          <h2>Where next?</h2>
          <p className="intro">
            A small collection of ideas, while your current journey stays close.
          </p>
          {[
            ["Tokyo", "A change of pace. A new favourite corner."],
            ["Zurich", "Lakeside mornings and mountain air."],
            ["Hong Kong", "A familiar city, with more to discover."],
          ].map(([name, sub]) => (
            <div className="destination-idea" key={name}>
              <span>{name.slice(0, 3).toUpperCase()}</span>
              <div>
                <h3>{name}</h3>
                <p>{sub}</p>
              </div>
            </div>
          ))}
          <p className="subtle small">
            Inspiration only. Flight search and booking integrations are
            deferred.
          </p>
        </>
      );
    default:
      return null;
  }
}
