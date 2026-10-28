import { boardingContext, weatherContext } from "./journey-context.js";
import { rankRecovery, time } from "./model.js";
import { loungeAccess } from "./lounge-rules.js";
import directory from "./venue-directory.json" with { type: "json" };
import { transportLabel, transportAllowance } from "./preparation-model.js";

// The passenger recommendation and inspector consume this one result.
// These are explicit product rules over the demonstration, not model reasoning.
export function planJourney(journey, preferences, preparation = {}) {
  const timing = boardingContext(journey);
  const weather = weatherContext(journey);
  const airport =
    journey.activeScenario === "airport" &&
    !["inflight", "arrived"].includes(journey.phase);
  const eligible =
    loungeAccess(
      directory.venues.find((v) => v.id === "cathay-pier-first"),
      journey.passenger.status === "Diamond" ? "diamond" : "unknown",
    ).kind === "eligible";
  const options = [];
  const add = (id, title, eligible, reasons, minutes = null) =>
    options.push({ id, title, eligible, reasons, minutes });
  const reasons = [];
  let action = {
    id: journey.nextModal,
    title: journey.nextTitle,
    detail: journey.nextDetail,
    modal: journey.nextModal,
    icon: journey.nextIcon,
  };
  const switchTo = (id, title, detail, modal, icon) => {
    action = { id, title, detail, modal, icon };
  };
  if (journey.recovery) {
    reasons.push("RECOVERY_SELECTED");
  } else if (journey.isDisrupted) {
    reasons.push("CANCELLATION_REQUIRES_RECOVERY");
    rankRecovery(preferences.recoveryPriority).forEach((option, i) => {
      add(option.id, `${option.airline} · ${option.cabin}`, true, [
        i === 0
          ? preferences.recoveryPriority === "business"
            ? "CABIN_THEN_ARRIVAL"
            : "EARLIEST_ARRIVAL"
          : "LOWER_RANKED_TRADEOFF",
      ]);
    });
  } else if (journey.isUncertain) {
    reasons.push(
      "REVISED_BOARDING_UNKNOWN",
      journey.disruptionCause === "weather"
        ? "CONFIRMED_SCENARIO_WEATHER_DELAY"
        : "CAUSE_UNCONFIRMED",
    );
  } else if (journey.connection) {
    reasons.push("TRANSFER_CHECKS_FIRST");
  } else if (journey.activeScenario === "gate") {
    reasons.push("GATE_CHANGED");
  } else if (airport) {
    if (timing.kind === "due") {
      switchTo(
        "gate",
        `Head to Gate ${journey.flight.gate}`,
        timing.detail,
        "pass",
        "ticket",
      );
      reasons.push("BOARDING_BUFFER_RESERVED");
    } else if (weather?.stage === "worsening") {
      switchTo(
        "stay-nearby",
        "Stay near your gate",
        `${timing.label}. Conditions are worsening; keep your plans flexible. No delay is confirmed.`,
        "weather",
        "cloud",
      );
      reasons.push("WEATHER_WORSENING", "WARNING_IS_NOT_FLIGHT_DELAY");
    } else if (timing.availableMinutes >= 15 && eligible) {
      switchTo(
        "lounge",
        "Make the most of your airport time",
        `${timing.label}. Up to ${timing.availableMinutes} min for a flexible lounge stop; leave by ${time(timing.leaveBy)} HKT (estimated).`,
        "lounge",
        "coffee",
      );
      reasons.push("LOUNGE_PROFILE_ELIGIBLE", "LOUNGE_FITS_TIME_BUDGET");
    } else if (timing.availableMinutes >= 5) {
      switchTo(
        "entertainment",
        "Choose something for your flight",
        `${timing.label}. Take 5 min to save music or a film while staying near your gate.`,
        "entertainment",
        "headphones",
      );
      reasons.push("SHORT_ACTIVITY_FITS", "LOUNGE_TIME_TOO_SHORT");
    } else {
      switchTo(
        "gate",
        `Head towards Gate ${journey.flight.gate}`,
        timing.detail,
        "pass",
        "ticket",
      );
      reasons.push("NO_ACTIVITY_TIME_AVAILABLE");
    }
  } else
    reasons.push(
      journey.phase === "inflight"
        ? "IN_FLIGHT"
        : journey.phase === "arrived"
          ? "ARRIVED"
          : "AIRPORT_TRANSFER_FIRST",
    );

  if (action.id === "lounge" && ["easy", "rest"].includes(preparation.intent)) {
    action.title =
      preparation.intent === "easy"
        ? "Take a quiet moment at The Pier"
        : "A quiet stop before your flight";
    reasons.push("CHOSEN_JOURNEY_PRIORITY");
  }
  if (action.id === "transport" && transportAllowance(preparation.transport)) {
    action.detail = `You’re planning ${transportLabel(preparation.transport).toLowerCase()}. Allow around ${transportAllowance(preparation.transport)} min from Central (estimated); check current conditions before leaving.`;
    action.modal = "prep-transport";
    reasons.push(`CHOSEN_TRANSPORT_${preparation.transport.toUpperCase()}`);
  }
  if (!journey.isDisrupted && !journey.recovery) {
    const blocks = [];
    if (!airport) blocks.push("NOT_FREE_AIRPORT_TIME");
    if (timing.kind !== "available")
      blocks.push("BOARDING_NOT_SAFE_FOR_ACTIVITY");
    if (weather?.stage === "worsening")
      blocks.push("STAY_NEAR_GATE_IN_WORSENING_WEATHER");
    const loungeBlocks = [...blocks];
    if (!eligible) loungeBlocks.push("FIRST_LOUNGE_PROFILE_NOT_ESTABLISHED");
    if (timing.availableMinutes < 15)
      loungeBlocks.push("LESS_THAN_15_MIN_FOR_LOUNGE");
    add(
      "lounge",
      "Flexible Cathay lounge visit",
      !loungeBlocks.length,
      loungeBlocks.length
        ? loungeBlocks
        : [
            "DIAMOND_PROFILE",
            "15_MIN_WALK_PLUS_10_MIN_BUFFER",
            "LIVE_CAPACITY_UNKNOWN",
          ],
      15,
    );
    const mediaBlocks =
      !airport || timing.availableMinutes < 5
        ? ["NOT_ENOUGH_CONFIRMED_SPARE_TIME"]
        : [];
    add(
      "entertainment",
      "Choose music and movies near the gate",
      !mediaBlocks.length,
      mediaBlocks.length
        ? mediaBlocks
        : ["FIVE_MINUTE_SELECTION", "NO_WALK_REQUIRED"],
      5,
    );
    add("treatment", "Timed lounge treatment", false, [
      "APPOINTMENT_AVAILABILITY_UNKNOWN",
    ]);
  }
  return {
    version: 1,
    ruleVersion: "journey-planner-1",
    clock: journey.clock,
    scenario: journey.activeScenario,
    phase: journey.phase || (airport ? "airport" : "pretravel"),
    status: journey.status,
    action,
    reasons,
    timing: {
      kind: timing.kind,
      label: timing.label,
      minutes: timing.minutes ?? null,
      availableMinutes: timing.availableMinutes,
      leaveBy: timing.leaveBy || null,
      walkMinutes: 15,
      bufferMinutes: 10,
    },
    inputs: [
      {
        label: "Flight",
        value: `${journey.flight.number} · ${journey.flight.origin} → ${journey.flight.destination}`,
        source: "Demonstration itinerary",
      },
      {
        label: "Boarding",
        value: journey.flight.boarding,
        source: "STD minus 40 min · simulation rule",
      },
      {
        label: "Weather",
        value: weather?.stage || "unknown",
        source: "Scenario timeline · not HKO observations",
      },
      {
        label: "Lounge profile",
        value: eligible
          ? "Diamond demo profile"
          : "First lounge access not established",
        source: "Synthetic traveller · published eligibility rules",
      },
      {
        label: "Recovery priority",
        value: preferences.recoveryPriority,
        source: "Chosen preference",
      },
    ],
    options,
    recoveryOrder: journey.isDisrupted
      ? rankRecovery(preferences.recoveryPriority).map((o) => o.id)
      : [],
  };
}

export const applyPlan = (journey, plan) => ({
  ...journey,
  nextTitle: plan.action.title,
  nextDetail: plan.action.detail,
  nextModal: plan.action.modal,
  nextIcon: plan.action.icon,
});

// Clock ticks update the time budget, but only meaningful rule/action changes
// create an entry in the explanation history.
export const decisionKey = (plan) =>
  JSON.stringify([
    plan.scenario,
    plan.phase,
    plan.action.id,
    plan.action.title,
    plan.reasons,
    plan.options.map((o) => [o.id, o.eligible, o.reasons]),
    plan.recoveryOrder,
  ]);

export function appendDecision(history, plan) {
  const key = decisionKey(plan);
  if (history.at(-1)?.key === key) return history;
  return [
    ...history.slice(-29),
    {
      key,
      clock: plan.clock,
      title: plan.action.title,
      reasons: plan.reasons,
      previous: history.at(-1)?.title || null,
    },
  ];
}
