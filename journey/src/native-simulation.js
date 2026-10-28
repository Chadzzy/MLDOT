import { BASE_JOURNEY } from "./data.js";

export const NATIVE_MODE =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("native") === "1";
const phases = ["pretravel", "airport", "boarding", "inflight", "arrived"];
const events = ["", "gate", "delay", "cancelled"];
export function validateNativeSnapshot(value) {
  if (
    !value ||
    value.version !== 1 ||
    typeof value.booked !== "boolean" ||
    typeof value.journeyID !== "string" ||
    value.journeyID.length > 64 ||
    !phases.includes(value.phase) ||
    !events.includes(value.event) ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0
  )
    return null;
  const clock = Date.parse(value.clock),
    start = Date.parse(BASE_JOURNEY.clock);
  if (
    !Number.isFinite(clock) ||
    clock < start ||
    clock > Date.parse(BASE_JOURNEY.flight.arrival)
  )
    return null;
  if (["inflight", "arrived"].includes(value.phase) && value.event) return null;
  const preferences = value.preferences;
  if (
    preferences &&
    (!["business", "earliest"].includes(preferences.recoveryPriority) ||
      typeof preferences.recoveryText !== "string" ||
      Array.from(preferences.recoveryText).length > 500)
  )
    return null;
  return {
    ...(preferences
      ? {
          preferences: {
            recoveryPriority: preferences.recoveryPriority,
            recoveryText: preferences.recoveryText,
          },
        }
      : {}),
    version: 1,
    booked: value.booked,
    journeyID: value.journeyID,
    phase: value.phase,
    event: value.event,
    clock: new Date(clock).toISOString(),
    revision: value.revision,
  };
}
export function nativeScenario(snapshot) {
  return (
    snapshot.event || (snapshot.phase === "pretravel" ? "normal" : "airport")
  );
}
export function applyNativeClock(journey, snapshot) {
  if (!snapshot?.booked) return journey;
  const next = { ...journey, clock: snapshot.clock, phase: snapshot.phase };
  if (snapshot.event || journey.recovery) return next;
  const states = {
    boarding: {
      status: "Boarding now",
      message: `Your flight to Zurich is boarding at Gate ${journey.flight.gate}.`,
      nextTitle: "Have your boarding pass ready",
      nextDetail: "Head to the gate. Boarding closes at 00:05 HKT.",
      nextModal: "pass",
      nextIcon: "ticket",
    },
    inflight: {
      status: "On your way to Zurich",
      message: "Settle in for your flight to Zurich.",
      nextTitle: "Your choices for the flight",
      nextDetail: "Your saved music and movies are ready to browse.",
      nextModal: "entertainment",
      nextIcon: "headphones",
      passState: "used",
    },
    arrived: {
      status: "Welcome to Zurich",
      message: "You’ve arrived in Zurich.",
      nextTitle: "Ease into your arrival",
      nextDetail: "Review your rest preferences for the day ahead.",
      nextModal: "rest",
      nextIcon: "moon",
      passState: "used",
    },
  };
  return { ...next, ...(states[snapshot.phase] || {}) };
}
export function requestNativePriorities(text) {
  if (!NATIVE_MODE || typeof text !== "string") return false;
  const handler = window.webkit?.messageHandlers?.journey;
  if (!handler) return false;
  handler.postMessage({ type: "recoveryRequest", text: text.slice(0, 500) });
  return true;
}

const preferenceRequests = new Map();
export function saveNativePreferences(priority, text) {
  const handler =
    typeof window !== "undefined" && window.webkit?.messageHandlers?.journey;
  if (!NATIVE_MODE || !handler)
    return Promise.resolve({
      ok: false,
      message: "The iPhone connection is unavailable.",
    });
  if (
    !["business", "earliest"].includes(priority) ||
    typeof text !== "string" ||
    text.length > 500
  )
    return Promise.resolve({
      ok: false,
      message: "Please check your preferences.",
    });
  const requestID = crypto.randomUUID();
  window.__journeyPreferenceResult = (result) => {
    const entry = preferenceRequests.get(result?.requestID);
    if (!entry) return;
    clearTimeout(entry.timeout);
    preferenceRequests.delete(result.requestID);
    entry.resolve({
      ok: result.ok === true,
      message:
        typeof result.message === "string"
          ? result.message
          : "The preference could not be saved.",
    });
  };
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      preferenceRequests.delete(requestID);
      resolve({
        ok: false,
        message:
          "Saving is taking longer than expected. Check your connection before retrying.",
      });
    }, 35000);
    preferenceRequests.set(requestID, { resolve, timeout });
    try {
      handler.postMessage({ type: "preferences", requestID, priority, text });
    } catch {
      clearTimeout(timeout);
      preferenceRequests.delete(requestID);
      resolve({ ok: false, message: "The iPhone connection is unavailable." });
    }
  });
}
