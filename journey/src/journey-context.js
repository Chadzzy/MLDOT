import { time } from "./model.js";

// Planning allowances are demo estimates, not measured airport routes.
export function boardingContext(journey) {
  const flight = journey.flight;
  if (journey.recovery || journey.isDisrupted)
    return {
      kind: "unconfirmed",
      label: "Replacement boarding time pending",
      detail:
        "Choose your recovery first. We’ll rebuild your time plan around the new flight.",
      availableMinutes: 0,
    };
  if (["inflight", "arrived"].includes(journey.phase))
    return {
      kind: "finished",
      label: journey.phase === "arrived" ? "You’ve arrived" : "You’re on board",
      detail: "Your airport activities are complete.",
      availableMinutes: 0,
    };
  if (journey.isUncertain)
    return {
      kind: "unconfirmed",
      label: "Revised boarding time unconfirmed",
      detail: `Original boarding ${time(flight.boarding)} HKT. Stay nearby; the delay does not yet give you extra activity time.`,
      availableMinutes: 0,
    };
  const minutes = Math.floor(
    (Date.parse(flight.boarding) - Date.parse(journey.clock)) / 60000,
  );
  if (!Number.isFinite(minutes))
    return {
      kind: "unconfirmed",
      label: "Boarding time unavailable",
      detail: "Check the airport displays before starting an activity.",
      availableMinutes: 0,
    };
  if (Date.parse(journey.clock) >= Date.parse(flight.cutoff))
    return {
      kind: "due",
      label: "Scheduled gate closing time reached",
      detail: `Contact the gate team at Gate ${flight.gate} now.`,
      availableMinutes: 0,
    };
  if (minutes <= 0)
    return {
      kind: "due",
      label: "It’s time to board",
      detail: `Head to Gate ${flight.gate}. Gate closes at ${time(flight.cutoff)} HKT.`,
      availableMinutes: 0,
    };
  return {
    kind: minutes > 25 ? "available" : "due",
    minutes,
    label: `${minutes} min until boarding · ${time(flight.boarding)} HKT`,
    detail:
      minutes > 25
        ? `Allow 15 min to reach Gate ${flight.gate}, plus a 10 min buffer (demo planning estimates).`
        : `Head towards Gate ${flight.gate} now; keep your remaining time for the walk.`,
    availableMinutes: Math.max(0, minutes - 25),
    leaveBy: new Date(Date.parse(flight.boarding) - 25 * 60000).toISOString(),
  };
}

export function weatherContext(journey) {
  const timeline = journey.weatherTimeline || [];
  const observation = timeline
    .filter((item) => Date.parse(item.at) <= Date.parse(journey.clock))
    .at(-1);
  if (!observation) return null;
  const impacted = journey.isUncertain && journey.disruptionCause === "weather";
  return {
    ...observation,
    stage: impacted ? "impact" : observation.stage,
    title: impacted ? "Weather is affecting your departure" : observation.title,
    detail: impacted
      ? "The demonstration flight is delayed because of weather at Hong Kong. Revised boarding and departure times are unconfirmed."
      : observation.detail,
    // A warning never changes a flight status. Only an explicit flight event does.
    source: "Scenario weather",
  };
}

export function readinessContext(journey) {
  const delayed = journey.isUncertain;
  const cause = delayed ? journey.disruptionCause : null;
  const weather = weatherContext(journey);
  return {
    title:
      cause === "weather"
        ? "Waiting for weather conditions"
        : cause === "maintenance"
          ? "Aircraft checks in progress"
          : delayed
            ? "Departure update pending"
            : "Preparing for your journey",
    summary:
      cause === "weather"
        ? "Weather at Hong Kong is holding departure."
        : cause === "maintenance"
          ? "Aircraft checks are holding departure."
          : delayed
            ? "The cause of the delay has not been confirmed."
            : weather?.stage === "worsening"
              ? "Conditions are worsening; no flight delay is confirmed."
              : "No disruption to this flight is confirmed.",
    detail:
      cause === "weather"
        ? "Weather conditions at Hong Kong are holding departure. We’ll show a revised boarding and departure time when they are confirmed."
        : cause === "maintenance"
          ? "The aircraft needs checks before departure. A completion time has not been confirmed."
          : delayed
            ? "The new departure time and reason are unconfirmed. We’ll update this timeline as information arrives."
            : "Aircraft preparation and weather are separate checks. Follow the current boarding time unless a flight update changes it.",
  };
}
