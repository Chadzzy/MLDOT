import { boardingContext, readinessContext } from "./journey-context.js";
import {
  NATIVE_MODE,
  validateNativeSnapshot,
  nativeScenario,
  applyNativeClock,
} from "./native-simulation.js";
import { GuidedJourneys } from "./GuidedJourneys.jsx";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { JourneyContext, useJourney } from "./context.js";
import heroPhoto from "./assets/hong-kong.jpg";
import loungePhoto from "./assets/pier-first.jpg";
import { LoungeArtwork } from "./ReferenceArtwork.jsx";
import { useJourneySheet } from "./useJourneySheet.js";
import { Icon, Wing } from "./icons.jsx";
import { BASE_JOURNEY } from "./data.js";
import { TRIGGERS, TRIGGER_GROUPS } from "./scenarios.js";
import {
  STORAGE_KEY,
  initialState,
  reducer,
  deriveJourney,
  time,
  date,
} from "./model.js";
import { demoProvider } from "./providers.js";
import {
  useLiveData,
  LiveSourcesPanel,
  LiveWarningWatch,
} from "./LiveData.jsx";
import {
  FlightCard,
  PassCard,
  ModuleRow,
  NextAction,
  TimingNote,
  WeatherWatch,
} from "./components.jsx";
import { ModalContents, MODAL_TITLES } from "./modals.jsx";

function readState() {
  try {
    return initialState(localStorage.getItem(STORAGE_KEY));
  } catch {
    return initialState();
  }
}

function StatusBar() {
  return (
    <div className="status-bar" aria-hidden="true">
      <strong>9:41</strong>
      <div className="status-symbols">
        <span className="signal">
          <i />
          <i />
          <i />
          <i />
        </span>
        <Icon name="wifi" size={18} />
        <span className="battery">
          <i />
        </span>
      </div>
    </div>
  );
}

function Hero() {
  const { journey, assets } = useJourney();
  return (
    <header className="member-hero">
      {assets.hero && <img src={assets.hero} alt="Hong Kong skyline" />}
      <div className="hero-overlay" />
      <div className="hero-top">
        <Wing />
        <div>
          <span aria-hidden="true">
            <Icon name="bell" size={24} />
          </span>
          <span className="more-dots" aria-hidden="true">
            •••
          </span>
        </div>
      </div>
      <div className="hero-greeting">
        <h1>
          Hello, {journey.passenger.greeting}
          <span className="member-gem">
            <Wing />
          </span>
        </h1>
        <p>
          <em>A</em>
          <strong>{journey.passenger.points}</strong>
          <span />
          Status point <strong>{journey.passenger.statusPoints}</strong>
        </p>
      </div>
    </header>
  );
}

function HomeContent({ tab }) {
  const { journey, state, open, assets } = useJourney();
  if (tab === "home")
    return (
      <>
        <Hero />
        <div className="home-sections">
          <div className="section-title">
            <h2>Upcoming journey</h2>
            <span className="section-link">View all</span>
          </div>
          <FlightCard />
          <p className="update-line">
            Last updated: {date(journey.clock)}, {time(journey.clock)} (GMT +8)
          </p>
          <div className="section-title">
            <h2>Recent searches</h2>
          </div>
          <div className="recent-searches">
            {[
              ["CEB", "HKG"],
              ["KIX", "HKG"],
            ].map(([from, to]) => (
              <div key={from} className="recent-search">
                <span>
                  <Icon name="plane" size={29} />
                </span>
                <div>
                  <small>10 Jun - 20 Jun</small>
                  <strong>
                    {from} <em>to</em>
                    <br />
                    {to}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  const titles = {
    book: [
      "A world of possibilities",
      "A little inspiration for another journey.",
    ],
    trips: ["Your journeys", "Everything for your next chapter."],
    profile: ["Hello, Emma", "Make this journey feel more like you."],
    tools: ["Travel tools", "The useful things, together in one place."],
  };
  return (
    <div className="tab-page">
      <Wing />
      <span className="mini-eyebrow">YOUR CATHAY JOURNEY</span>
      <h1>{titles[tab][0]}</h1>
      <p className="intro">{titles[tab][1]}</p>
      {tab === "trips" ? (
        <>
          <FlightCard />
          <ModuleRow
            icon="ticket"
            title="Boarding pass"
            onClick={() => open("pass")}
          />
          <ModuleRow
            icon="headphones"
            title="Your flight entertainment plan"
            subtitle={`${state.saved.length} selections saved`}
            onClick={() => open("entertainment")}
          />
        </>
      ) : tab === "profile" ? (
        <>
          <div className="profile-card">
            <div className="profile-avatar">EC</div>
            <h2>{journey.passenger.name}</h2>
            <span className="gold-tag">Diamond · Demo profile</span>
          </div>
          <ModuleRow
            icon="settings"
            title="Your preferences"
            subtitle="Quiet spaces, food preferences and more"
            onClick={() => open("profile")}
          />
          <ModuleRow
            icon="coffee"
            title="Explore lounge eligibility"
            subtitle="Cathay lounges only · demo rules"
            onClick={() => open("lounge")}
          />
        </>
      ) : tab === "book" ? (
        <>
          <div className="explore-art">
            {assets.hero && <img src={assets.hero} alt="Hong Kong skyline" />}
            <span>
              Your next
              <br />
              great story.
            </span>
          </div>
          <button className="primary-button" onClick={() => open("explore")}>
            Explore destination ideas
            <Icon name="arrow" size={18} />
          </button>
          <p className="subtle small">
            Booking integrations are deferred in this prototype.
          </p>
        </>
      ) : (
        <div className="module-group">
          {[
            ["cloud", "Weather outlook", "weather"],
            ["map", "Airport directions", "directions"],
            ["coffee", "Cathay lounge access", "lounge"],
            ["shield", "Travel checklist", "documents"],
            ["headphones", "Entertainment plan", "entertainment"],
            ["moon", "Rest-plan concept", "rest"],
            ["share", "Sharing preview", "share"],
            ["settings", "Demo controls", "research"],
          ].map(([i, t, m]) => (
            <ModuleRow key={m} icon={i} title={t} onClick={() => open(m)} />
          ))}
        </div>
      )}
    </div>
  );
}

function JourneySheet({ expanded, setExpanded }) {
  const { journey, state, open, assets } = useJourney();
  const scrollRef = useRef(null);
  const sheet = useJourneySheet(expanded, setExpanded);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [journey.activeScenario]);
  const normal = journey.tone === "normal";
  const timing = boardingContext(journey);
  const readiness = readinessContext(journey);
  return (
    <section
      ref={sheet.ref}
      style={sheet.style}
      data-snap={expanded}
      className={`journey-sheet tone-${journey.tone} ${expanded ? "expanded" : ""} ${sheet.dragging ? "dragging" : ""}`}
      aria-label="Persistent journey sheet"
    >
      <button
        className="sheet-situation"
        aria-label={
          expanded === 2 ? "Collapse journey sheet" : "Expand journey sheet"
        }
        aria-expanded={expanded > 0}
        aria-controls="journey-sheet-content"
        {...sheet.events}
      >
        <span className="situation-compact">{journey.status}</span>
        <span className="situation-full">
          <small>{journey.passenger.greeting}</small>
          <strong>{journey.message}</strong>
          <p>{normal ? timing.label : journey.detail}</p>
          <Icon name="down" size={23} />
        </span>
      </button>
      <div
        className="sheet-summary"
        inert={sheet.reveal === 1 ? true : undefined}
      >
        <button
          className="sheet-summary-main"
          {...sheet.events}
          aria-label="Expand journey sheet"
          aria-expanded={expanded > 0}
        >
          <strong>
            {journey.recovery
              ? "Your recovery to Zurich"
              : `${journey.flight.number} to Zurich`}
          </strong>
          <small>
            {journey.recovery
              ? "Replacement boarding pass pending"
              : journey.isDisrupted
                ? "Original flight cancelled · view next steps"
                : journey.isUncertain
                  ? "New departure estimate updating"
                  : journey.phase === "inflight"
                    ? "In flight · your saved choices"
                    : journey.phase === "arrived"
                      ? "Arrived in Zurich"
                      : `Gate ${journey.flight.gate} • Boarding at ${time(journey.flight.boarding)}`}
          </small>
        </button>
        <button
          className="sheet-expand"
          aria-label="Expand journey sheet"
          {...sheet.events}
        >
          <Icon name="down" size={24} />
        </button>
      </div>
      <button
        className="pass-shortcut"
        aria-label="Open boarding pass"
        onClick={() => open("pass")}
      >
        <Icon name="ticket" size={28} />
      </button>
      <div
        id="journey-sheet-content"
        className="sheet-scroll"
        ref={scrollRef}
        inert={sheet.reveal === 0 ? true : undefined}
        aria-hidden={sheet.reveal === 0}
      >
        <WeatherWatch />
        <LiveWarningWatch />
        {normal && <NextAction />}
        {!normal && <TimingNote />}
        {journey.isDisrupted ? (
          <div className="disruption-card">
            <h2>
              {journey.recovery
                ? "Your journey has been updated"
                : "Tell us what matters"}
            </h2>
            <p>
              {journey.recovery
                ? `${journey.recovery.airline} · ${journey.recovery.cabin}`
                : "We’ll compare arrival time, cabin and overnight comfort to find your best recovery."}
            </p>
            <button className="primary-button" onClick={() => open("recovery")}>
              {journey.recovery
                ? "View your recovery"
                : "Find my recovery options"}
            </button>
          </div>
        ) : journey.activeScenario === "gate" ? (
          <GateDirections open={open} gate={journey.flight.gate} />
        ) : journey.isUncertain ? (
          <>
            <div className="delayed-flight-card">
              <div className="delay-card-heading">
                <span>
                  <small>FLIGHT {journey.flight.number}</small>
                  <strong>Hong Kong to Zurich</strong>
                </span>
                <b>• DELAYED</b>
              </div>
              <div className="delayed-route">
                <strong>HKG</strong>
                <div>
                  <Icon name="plane" />
                  <span />
                </div>
                <strong>ZRH</strong>
              </div>
              <div className="delay-city-labels">
                <span>Hong Kong</span>
                <span>Zurich</span>
              </div>
              <div className="estimate-row">
                <span>
                  <small>Original Departure</small>
                  <b>{time(journey.flight.departure)}</b>
                </span>
                <span>
                  <small>New Est. Departure</small>
                  <b>• Updating</b>
                </span>
              </div>
              <p className="flight-update">
                <Icon name="clock" size={17} />
                {readiness.summary} New departure time unconfirmed.
              </p>
            </div>
            <div className="readiness-card">
              <ModuleRow
                icon="plane"
                title="Aircraft readiness"
                subtitle={readiness.title}
                onClick={() => open("readiness")}
              />
              <button
                onClick={() => open("readiness")}
                className="readiness-strip"
              >
                <Icon name="info" size={17} />
                {readiness.summary}
              </button>
            </div>
            <div className="lifestyle-card">
              <div className="lifestyle-heading">
                <Icon name="chevron" />
                <div>
                  <strong>Your included Cathay lounge</strong>
                  <p>
                    Stay nearby. Your revised boarding time is not yet
                    confirmed.
                  </p>
                </div>
              </div>
              <div className="lifestyle-photo reference-photo">
                <LoungeArtwork />
              </div>
              <div className="lifestyle-actions">
                <strong>Take a moment for yourself</strong>
                <p>
                  Access to The Pier, First is included. Check with the gate
                  team before leaving; we cannot yet confirm time for a lounge
                  visit.
                </p>
                <div>
                  <button
                    className="primary-button"
                    onClick={() => open("lounge-directions")}
                  >
                    Get Directions
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => open("lounge")}
                  >
                    Explore the lounge
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : journey.passState === "used" ? (
          <FlightCard />
        ) : (
          <PassCard />
        )}
        {!journey.isDisrupted &&
          !["inflight", "arrived"].includes(journey.phase) && (
            <div className="before-fly">
              <h2>Before you fly</h2>
              <div className="module-group">
                <ModuleRow
                  icon="seat"
                  title="Seat"
                  subtitle={journey.flight.seat}
                  onClick={() => open("seat")}
                />
                <ModuleRow
                  icon="coffee"
                  title="Lounge"
                  subtitle={`The Pier, First · ${timing.label}`}
                  onClick={() => open("lounge")}
                />
              </div>
            </div>
          )}
        <div className="sheet-more">
          <div className="module-group">
            <ModuleRow
              icon="headphones"
              title="Choose your music & movies"
              subtitle={
                state.saved.length
                  ? `${state.saved.length} saved for your flight`
                  : "About 5 min to choose · enjoy on board"
              }
              onClick={() => open("entertainment")}
            />
            <ModuleRow
              icon="cloud"
              title="Weather along the way"
              onClick={() => open("weather")}
            />
            <ModuleRow
              icon="moon"
              title="Jet lag & rest"
              subtitle={`Arrive ${time(journey.recovery?.arrival || journey.flight.arrival, "Europe/Zurich")} Zurich time`}
              onClick={() => open("rest")}
            />
            <ModuleRow
              icon="share"
              title="Share your journey"
              onClick={() => open("share")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function GateDirections({ open, gate }) {
  return (
    <div className="gate-inline">
      <div className="gate-map" aria-label="Illustrative route to the new gate">
        <svg viewBox="0 0 327 187" role="img">
          <rect width="327" height="187" rx="15" fill="#f3f3f1" />
          <g fill="#e9e9e7">
            <rect x="17" y="26" width="66" height="49" rx="10" />
            <rect x="260" y="22" width="47" height="56" rx="10" />
            <rect x="131" y="114" width="108" height="63" rx="10" />
          </g>
          <path
            d="M56 163V93H234V52"
            stroke="#191919"
            fill="none"
            strokeWidth="3"
            strokeDasharray="1 8"
            strokeLinecap="round"
          />
          <circle
            cx="56"
            cy="163"
            r="8"
            fill="white"
            stroke="#333"
            strokeWidth="4"
          />
          <circle cx="234" cy="47" r="8" fill="#8b790b" />
          <text x="170" y="42" fontSize="12" fill="#827207">
            Gate {gate}
          </text>
          <rect
            x="71"
            y="150"
            width="80"
            height="20"
            rx="10"
            fill="white"
            stroke="#aaa"
          />
          <text x="81" y="164" fontSize="11">
            You are here
          </text>
        </svg>
      </div>
      <div className="gate-instructions">
        <h3>
          <Icon name="map" />
          How to get there?
        </h3>
        {[
          ["up", "Walk straight ahead", "Follow the departure-gates signs"],
          [
            "arrow",
            "Continue along the concourse",
            `Follow signs towards Gate ${gate}`,
          ],
          [
            "back",
            `Check the display at Gate ${gate}`,
            "Your new gate is just ahead",
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
        <button className="secondary-button" onClick={() => open("directions")}>
          View route details
        </button>
      </div>
    </div>
  );
}

function DetailDialog({ item, active, close }) {
  const { open } = useJourney();
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (!active) return;
    const previous = document.activeElement;
    ref.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement && document.contains(previous))
        previous.focus({ preventScroll: true });
    };
  }, [active]);
  function keydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...ref.current.querySelectorAll(
        'button:not([disabled]),a[href],input:not([disabled]),select,textarea,summary,[tabindex="0"]',
      ),
    ].filter((el) => el.offsetParent !== null);
    const first = focusable[0],
      last = focusable.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === ref.current)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        document.activeElement === ref.current)
    ) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <div
      className={`modal-layer ${item.closing ? "closing" : ""}`}
      hidden={!active}
    >
      <div className="modal-backdrop" />
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${item.id}`}
        tabIndex={-1}
        className={`detail-sheet detail-${item.type}`}
        onKeyDown={keydown}
      >
        <header className="detail-header">
          <button onClick={close} aria-label="Back">
            <Icon name="back" />
          </button>
          <span className="sr-only" id={`modal-title-${item.id}`}>
            {MODAL_TITLES[item.type]}
          </span>
          {item.type !== "pass" && (
            <button
              onClick={() => open("pass")}
              aria-label="Open boarding pass"
            >
              <Icon name="ticket" />
            </button>
          )}
          <button onClick={close} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </header>
        <div className="detail-scroll">
          <ModalContents type={item.type} />
        </div>
      </section>
    </div>
  );
}

function AppView() {
  const {
    journey,
    dispatch,
    open,
    stack,
    close,
    closeAll,
    toastMessage,
    storageWarning,
    nativeSnapshot,
  } = useJourney();
  const [expanded, setExpanded] = useState(0);
  const tab = "home";
  const [trigger, setTrigger] = useState("home");
  const navigate = useCallback(
    (route) => {
      const [id, query] = route.split("?");
      const context = new URLSearchParams(query).get("scenario");
      const selected =
        TRIGGERS.find((t) => t.id === id) ||
        TRIGGERS.find((t) => t.id === "home");
      closeAll();
      dispatch({
        type: "SCENARIO",
        value:
          selected.id === "pass" &&
          ["gate", "delay", "connection", "cancelled"].includes(context)
            ? context
            : selected.scenario,
      });
      if (selected.recovery)
        dispatch({ type: "RECOVER", id: selected.recovery });
      setExpanded(selected.expanded ? 2 : 0);
      setTrigger(selected.id);
      if (selected.modal) open(selected.modal);
    },
    [closeAll, dispatch, open],
  );
  useEffect(() => {
    if (NATIVE_MODE) return;
    const change = () => navigate(window.location.hash.slice(1));
    change();
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, [navigate]);
  useEffect(() => {
    if (!NATIVE_MODE || !nativeSnapshot) return;
    closeAll();
    setExpanded(
      nativeSnapshot.phase === "pretravel" && !nativeSnapshot.event ? 0 : 2,
    );
  }, [
    closeAll,
    nativeSnapshot?.phase,
    nativeSnapshot?.event,
    nativeSnapshot?.journeyID,
  ]);
  const choose = (id, { scenario } = {}) => {
    const route = scenario
      ? `${id}?scenario=${encodeURIComponent(scenario)}`
      : id;
    if (window.location.hash === `#${route}`) navigate(route);
    else window.location.hash = route;
  };
  return (
    <div className="scenario-site">
      <header className="site-header">
        <strong>Day of travel</strong>
        <span>Scenario walkthrough</span>
        <button onClick={() => choose("home")}>
          <Icon name="refresh" size={15} />
          Reset journey
        </button>
      </header>
      <div className="site-body">
        <aside className="trigger-navigation">
          <GuidedJourneys choose={choose} trigger={trigger} />
          <p>Choose a trigger</p>
          <select
            className="mobile-trigger-select"
            aria-label="Choose a trigger"
            value={trigger}
            onChange={(e) => choose(e.target.value)}
          >
            {TRIGGER_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <nav aria-label="Scenario triggers">
            {TRIGGER_GROUPS.map((group) => (
              <div className="trigger-group" key={group.label}>
                <h2>{group.label}</h2>
                {group.items.map((item, i) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    aria-current={trigger === item.id ? "page" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      choose(item.id);
                    }}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {item.label}
                    <Icon name="chevron" size={14} />
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <LiveSourcesPanel onOpen={() => choose("live")} />
          <div className="site-data-note">
            Interactive prototype · flight events and boarding codes are
            illustrative. Live weather and trains are available under Real data
            connections.
          </div>
        </aside>
        <main className="scenario-stage">
          <div className="stage-title">
            <span>{TRIGGERS.find((t) => t.id === trigger)?.label}</span>
            <small>iPhone · 375 × 812</small>
          </div>
          <div className="iphone-footprint">
            <div className="iphone-frame">
              <div className="iphone-side-button side-mute" />
              <div className="iphone-side-button side-volume" />
              <div className="iphone-side-button side-power" />
              <div className={`device tone-${journey.tone}`}>
                {NATIVE_MODE && !nativeSnapshot?.booked && (
                  <section className="native-booking">
                    <Wing />
                    <h1>Begin your journey</h1>
                    <p>
                      Hong Kong to Zurich, with an experience that changes as
                      you travel.
                    </p>
                    <FlightCard />
                    <button
                      className="primary-button"
                      onClick={() =>
                        window.webkit?.messageHandlers?.journey?.postMessage({
                          type: "controls",
                        })
                      }
                    >
                      Set up a demonstration trip
                    </button>
                    <p className="small">
                      Demonstration booking · no payment or ticket issued
                    </p>
                  </section>
                )}
                <div
                  className="app-surface"
                  inert={
                    stack.length > 0 || (NATIVE_MODE && !nativeSnapshot?.booked)
                      ? true
                      : undefined
                  }
                >
                  <div className="home-scroll" key={tab}>
                    <HomeContent tab={tab} />
                  </div>
                  <div
                    className={`journey-backdrop ${expanded ? "visible" : ""}`}
                  />
                  <JourneySheet expanded={expanded} setExpanded={setExpanded} />
                  <nav className="bottom-nav" aria-label="Main navigation">
                    {[
                      ["home", "home", "Home"],
                      ["book", "plane", "Book"],
                      ["trips", "bag", "My trips"],
                      ["profile", "user", "Profile"],
                      ["tools", "grid", "Travel tools"],
                    ].map(([id, icon, label]) => (
                      <div
                        key={id}
                        className={tab === id ? "active" : ""}
                        aria-current={tab === id ? "page" : undefined}
                      >
                        <Icon name={icon} size={27} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </nav>
                </div>
                {stack.map((item, i) => (
                  <DetailDialog
                    key={item.id}
                    item={item}
                    active={i === stack.length - 1}
                    close={close}
                  />
                ))}
                <StatusBar />
                <div className="iphone-notch" aria-hidden="true">
                  <span />
                  <i />
                </div>
                <div className="home-indicator" aria-hidden="true" />
                {toastMessage && (
                  <div className="toast" role="status">
                    <Icon name="check" size={17} />
                    {toastMessage}
                  </div>
                )}
                <div className="sr-only" role="status" aria-live="polite">
                  {journey.status}. {journey.message}
                </div>
                {storageWarning && (
                  <div className="storage-warning" role="status">
                    Choices will last for this visit.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const liveApi = useLiveData();
  const [state, dispatch] = useReducer(reducer, null, readState);
  const [snapshot, setSnapshot] = useState(BASE_JOURNEY);
  const [nativeSnapshot, setNativeSnapshot] = useState(null);
  useEffect(() => {
    if (!NATIVE_MODE) return;
    window.__journeyNativeReceive = (value) => {
      const valid = validateNativeSnapshot(value);
      if (valid) setNativeSnapshot(valid);
    };
    window.__journeyPriorityReceive = (priority) => {
      if (["business", "earliest"].includes(priority))
        dispatch({
          type: "PREFERENCE",
          key: "recoveryPriority",
          value: priority,
        });
    };
    return () => {
      delete window.__journeyNativeReceive;
      delete window.__journeyPriorityReceive;
    };
  }, []);
  const nativeScenarioValue = nativeSnapshot
    ? nativeScenario(nativeSnapshot)
    : "normal";
  useEffect(() => {
    if (!NATIVE_MODE || !nativeSnapshot) return;
    dispatch({
      type: "NATIVE_SCENARIO",
      value: nativeScenarioValue,
      journeyID: nativeSnapshot.journeyID,
    });
  }, [nativeScenarioValue, nativeSnapshot?.journeyID]);
  useEffect(() => {
    if (!NATIVE_MODE || !nativeSnapshot?.preferences) return;
    dispatch({
      type: "SERVER_PREFERENCES",
      journeyID: nativeSnapshot.journeyID,
      preferences: nativeSnapshot.preferences,
    });
  }, [
    nativeSnapshot?.journeyID,
    nativeSnapshot?.preferences?.recoveryPriority,
    nativeSnapshot?.preferences?.recoveryText,
  ]);
  const [evidence, setEvidence] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [stack, setStack] = useState([]);
  const [assets, setAssets] = useState({
    hero: heroPhoto,
    lounge: loungePhoto,
  });
  const closingTimer = useRef(null);
  const closeAll = useCallback(() => {
    clearTimeout(closingTimer.current);
    setStack([]);
  }, []);
  useEffect(() => () => clearTimeout(closingTimer.current), []);
  const [toastMessage, setToastMessage] = useState("");
  const timer = useRef(null);
  const modalId = useRef(0);
  const open = useCallback(
    (type) =>
      setStack((s) =>
        s.at(-1)?.type === type ? s : [...s, { type, id: ++modalId.current }],
      ),
    [],
  );
  const close = useCallback(() => {
    setStack((s) =>
      s.length ? [...s.slice(0, -1), { ...s.at(-1), closing: true }] : s,
    );
    clearTimeout(closingTimer.current);
    closingTimer.current = setTimeout(
      () => setStack((s) => (s.at(-1)?.closing ? s.slice(0, -1) : s)),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220,
    );
  }, []);
  const toast = useCallback((message) => {
    setToastMessage(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMessage(""), 2400);
  }, []);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await demoProvider.getSnapshot();
      setSnapshot(result.data);
      setEvidence(result.evidence);
    } catch {
      toast("Sample data could not be loaded. Please retry.");
    } finally {
      setRefreshing(false);
    }
  }, [toast]);
  useEffect(() => {
    refresh();
    return () => clearTimeout(timer.current);
  }, [refresh]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [state]);
  const journey = applyNativeClock(
    deriveJourney(state, snapshot),
    NATIVE_MODE ? nativeSnapshot : null,
  );
  return (
    <JourneyContext.Provider
      value={{
        ...liveApi,
        state,
        nativeSnapshot,
        assets,
        setAssets,
        closeAll,
        dispatch,
        journey,
        evidence,
        refreshing,
        refresh,
        open,
        close,
        stack,
        toast,
        toastMessage,
        storageWarning,
      }}
    >
      <AppView />
    </JourneyContext.Provider>
  );
}
