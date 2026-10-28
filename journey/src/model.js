import {
  BASE_JOURNEY,
  RECOVERY_OPTIONS,
  DEFAULT_PREFERENCES,
  CATALOGUE,
  SCENARIOS,
} from "./data.js";

export const STORAGE_KEY = "cathay-journey-demo-v1";
export const time = (iso, zone = "Asia/Hong_Kong") =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
    hourCycle: "h23",
  }).format(new Date(iso));
export const date = (iso, zone = "Asia/Hong_Kong") =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: zone,
  }).format(new Date(iso));
export const fullDate = (iso, zone = "Asia/Hong_Kong") =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: zone,
  }).format(new Date(iso));
export function initialState(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch {
    parsed = {};
  }
  if (!parsed || typeof parsed !== "object") parsed = {};
  const p =
    parsed.preferences && typeof parsed.preferences === "object"
      ? parsed.preferences
      : {};
  return {
    nativeJourneyID:
      typeof parsed.nativeJourneyID === "string"
        ? parsed.nativeJourneyID.slice(0, 64)
        : null,
    scenario: SCENARIOS.some((s) => s.id === parsed.scenario)
      ? parsed.scenario
      : "normal",
    recoveryId:
      RECOVERY_OPTIONS.some((o) => o.id === parsed.recoveryId) &&
      parsed.scenario === "cancelled"
        ? parsed.recoveryId
        : null,
    saved: Array.isArray(parsed.saved)
      ? [...new Set(parsed.saved)].filter((id) =>
          CATALOGUE.some((c) => c.id === id),
        )
      : [],
    preferences: {
      ...DEFAULT_PREFERENCES,
      mood: ["unwind", "discover", "focus", "rest"].includes(p.mood)
        ? p.mood
        : DEFAULT_PREFERENCES.mood,
      recoveryPriority: ["business", "earliest"].includes(p.recoveryPriority)
        ? p.recoveryPriority
        : "business",
      recoveryText:
        typeof p.recoveryText === "string"
          ? p.recoveryText.slice(0, 500)
          : DEFAULT_PREFERENCES.recoveryText,
      quiet: typeof p.quiet === "boolean" ? p.quiet : true,
      vegetarian: typeof p.vegetarian === "boolean" ? p.vegetarian : false,
      location: ["Gate 40", "Lounge entrance", "Security exit"].includes(
        p.location,
      )
        ? p.location
        : "Gate 40",
    },
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case "NATIVE_SCENARIO":
      if (
        !SCENARIOS.some((s) => s.id === action.value) ||
        typeof action.journeyID !== "string"
      )
        return state;
      if (
        state.scenario === action.value &&
        state.nativeJourneyID === action.journeyID
      )
        return state;
      return {
        ...state,
        scenario: action.value,
        nativeJourneyID: action.journeyID,
        recoveryId: null,
      };
    case "SCENARIO":
      return SCENARIOS.some((s) => s.id === action.value)
        ? { ...state, scenario: action.value, recoveryId: null }
        : state;
    case "RESET":
      return { ...state, scenario: "normal", recoveryId: null };
    case "SAVE":
      return CATALOGUE.some((c) => c.id === action.id)
        ? {
            ...state,
            saved: state.saved.includes(action.id)
              ? state.saved.filter((id) => id !== action.id)
              : [...state.saved, action.id],
          }
        : state;
    case "MOVE": {
      const from = state.saved.indexOf(action.id),
        to = from + action.direction;
      if (from < 0 || to < 0 || to >= state.saved.length) return state;
      const saved = [...state.saved];
      [saved[from], saved[to]] = [saved[to], saved[from]];
      return { ...state, saved };
    }
    case "PREFERENCE":
      return initialState(
        JSON.stringify({
          ...state,
          preferences: { ...state.preferences, [action.key]: action.value },
        }),
      );
    case "RECOVER":
      return state.scenario === "cancelled" &&
        RECOVERY_OPTIONS.some((o) => o.id === action.id)
        ? { ...state, recoveryId: action.id }
        : state;
    default:
      return state;
  }
}

export function rankRecovery(priority) {
  return [...RECOVERY_OPTIONS].sort((a, b) => {
    if (priority === "business" && a.business !== b.business)
      return Number(b.business) - Number(a.business);
    return new Date(a.arrival) - new Date(b.arrival);
  });
}

export function deriveJourney(state, snapshot = BASE_JOURNEY) {
  const flight = {
    ...snapshot.flight,
    gate: state.scenario === "gate" ? "62" : snapshot.flight.gate,
  };
  const recovery =
    RECOVERY_OPTIONS.find((o) => o.id === state.recoveryId) || null;
  const common = {
    ...snapshot,
    flight,
    clock:
      {
        airport: "2026-10-27T14:55:00Z",
        gate: "2026-10-27T15:25:00Z",
        delay: "2026-10-27T14:55:00Z",
        cancelled: "2026-10-27T15:00:00Z",
        connection: "2026-10-27T15:15:00Z",
      }[state.scenario] || snapshot.clock,
    connection:
      state.scenario === "connection"
        ? {
            arrival: "2026-10-27T15:15:00Z",
            arrivalGate: "209",
            inboundNumber: "CX704",
            originName: "Bangkok",
            minutes: Math.floor(
              (Date.parse(flight.cutoff) - Date.parse("2026-10-27T15:15:00Z")) /
                60000,
            ),
          }
        : null,
    recovery,
    isDisrupted: state.scenario === "cancelled",
    isUncertain: state.scenario === "delay",
    activeScenario: state.scenario,
  };
  if (recovery)
    return {
      ...common,
      tone: "recovered",
      status: "Recovery selected",
      message: "Your new journey is taking shape.",
      detail:
        "Your choice is saved in this demo. Booking and ticketing are simulated.",
      nextTitle: "Review your recovery plan",
      nextDetail: "Your replacement boarding pass is pending.",
      nextModal: "recovery",
      nextIcon: "check",
      passState: "superseded",
    };
  switch (state.scenario) {
    case "airport":
      return {
        ...common,
        tone: "normal",
        status: "Everything is on track",
        message: "Everything is on track for your flight to Zurich.",
        detail: `Boarding at ${time(flight.boarding)} · Gate ${flight.gate}`,
        nextTitle: "Make the most of your airport time",
        nextDetail:
          "Your Cathay lounge access is included. Keep your boarding time in view.",
        nextModal: "lounge",
        nextIcon: "coffee",
        passState: "demo",
      };
    case "connection":
      return {
        ...common,
        tone: "gate",
        status: "Connection time reduced",
        message: `Head straight to Gate ${flight.gate} for your flight to Zurich.`,
        detail:
          "Follow the transfer signs. Check with the gate team when you arrive.",
        nextTitle: "Check your connection",
        nextDetail: "Allow time for transfer checks and getting to your gate.",
        nextModal: "connection",
        nextIcon: "clock",
        passState: "demo",
      };
    case "gate":
      return {
        ...common,
        tone: "gate",
        status: "Gate changed",
        message: `Your flight will now depart from Gate ${flight.gate}.`,
        detail:
          "Your boarding time is unchanged. Check the route from your selected location.",
        nextTitle: `Head to Gate ${flight.gate}`,
        nextDetail: "Open the illustrative airport directions.",
        nextModal: "directions",
        nextIcon: "sign",
        passState: "demo",
      };
    case "delay":
      return {
        ...common,
        tone: "delay",
        status: "Flight delayed",
        message: "Your flight to Zurich is delayed.",
        detail:
          "The new departure time is being confirmed. We’ll keep your next steps together.",
        nextTitle: "Stay nearby while we update you",
        nextDetail:
          "Choose something flexible. Your usable time is not yet confirmed.",
        nextModal: "readiness",
        nextIcon: "clock",
        passState: "demo",
      };
    case "cancelled":
      return {
        ...common,
        tone: "cancelled",
        status: "Flight cancelled",
        message: "Let’s get your journey back on track.",
        detail:
          "Your flight to Zurich has been cancelled in this scenario. Tell us what matters for your next flight.",
        nextTitle: "Find a recovery that works for you",
        nextDetail: "Compare arrival time, cabin and connections.",
        nextModal: "recovery",
        nextIcon: "refresh",
        passState: "cancelled",
      };
    default:
      return {
        ...common,
        tone: "normal",
        status: "Everything is on track",
        message: "Everything is on track for your flight to Zurich.",
        detail: `Boarding at ${time(flight.boarding)} · Gate ${flight.gate}`,
        nextTitle: "Head to the airport",
        nextDetail:
          "Based on your location, you’ll arrive at the airport by 22:55 by car.",
        nextModal: "transport",
        nextIcon: "arrow",
        passState: "demo",
      };
  }
}

export function entertainmentMinutes(saved) {
  return saved.reduce(
    (total, id) => total + (CATALOGUE.find((c) => c.id === id)?.duration || 0),
    0,
  );
}

export function displayFlight(journey) {
  if (!journey.recovery) return journey.flight;
  return {
    ...journey.flight,
    number: journey.recovery.number,
    departure: journey.recovery.departure,
    arrival: journey.recovery.arrival,
    duration: journey.recovery.duration,
    via: journey.recovery.via,
    terminal: null,
    destinationTerminal: null,
    gate: null,
    seat: null,
    boarding: null,
    cabin: journey.recovery.cabin,
    airline: journey.recovery.airline,
  };
}

export function liveActivity(journey) {
  if (journey.recovery)
    return {
      title: "Recovery selected",
      value: time(journey.recovery.departure),
      label: "New departure · demo",
      subtitle: "Replacement pass pending",
      icon: "check",
    };
  if (journey.isDisrupted)
    return {
      title: "Your next step",
      value: "Let’s replan",
      label: "Recovery options",
      subtitle: "Choose what matters to you",
      icon: "refresh",
    };
  if (journey.connection)
    return {
      title: "Your connection",
      value: `${journey.connection.minutes} min`,
      label: "Until gate closes",
      subtitle: `Gate ${journey.flight.gate} · ${journey.flight.number} to Zurich`,
      icon: "clock",
    };
  if (journey.isUncertain)
    return {
      title: "Flight delayed",
      value: "Updating",
      label: "Departure estimate",
      subtitle: "Stay nearby · timing unconfirmed",
      icon: "clock",
    };
  return {
    title:
      journey.activeScenario === "gate"
        ? "Your gate has changed"
        : "Your journey to Zurich",
    value: journey.flight.gate,
    label: "Gate",
    subtitle: `Boarding ${time(journey.flight.boarding)} · ${journey.flight.number}`,
    icon: "plane",
  };
}
