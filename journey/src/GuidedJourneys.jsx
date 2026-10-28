import { useState } from "react";
import { TRIGGERS } from "./scenarios.js";

const JOURNEYS = [
  {
    name: "New · Make the journey yours",
    moments: [
      "prepare",
      "prep-intent",
      "prep-transport",
      "prep-family",
      "prep-food",
      "prep-rest",
      "prep-media",
      "prep-onboard",
      "prep-arrival",
      "prep-feedback",
    ],
  },
  {
    name: "1. From home to boarding",
    moments: [
      "home",
      "journey",
      "weather",
      "lounge",
      "entertainment",
      "gate",
      "pass",
    ],
  },
  {
    name: "2. Delay to recovery",
    moments: ["home", "delay", "readiness", "cancelled", "recovery"],
  },
];

export function GuidedJourneys({ choose, trigger }) {
  const [selected, setSelected] = useState(null);
  const route = JOURNEYS[selected];
  const index = route?.moments.indexOf(trigger) ?? -1;
  return (
    <div className="guided-journeys">
      <strong>Walk through a journey</strong>
      {JOURNEYS.map((journey, i) => (
        <button
          key={journey.name}
          aria-pressed={selected === i}
          onClick={() => {
            setSelected(i);
            choose(journey.moments[0]);
          }}
        >
          {journey.name}
        </button>
      ))}
      {route && (
        <div className="guided-step" aria-live="polite">
          {index >= 0
            ? `${index + 1} of ${route.moments.length} · ${TRIGGERS.find((t) => t.id === trigger)?.label}`
            : "Choose the next moment in this journey."}
          <div>
            {index > 0 && (
              <button onClick={() => choose(route.moments[index - 1])}>
                Previous
              </button>
            )}
            {index < route.moments.length - 1 && (
              <button
                onClick={() =>
                  choose(
                    route.moments[index + 1],
                    trigger === "gate" && route.moments[index + 1] === "pass"
                      ? { scenario: "gate" }
                      : {},
                  )
                }
              >
                Next moment →
              </button>
            )}
            {index === route.moments.length - 1 && (
              <button onClick={() => choose(route.moments[0])}>
                Start again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
