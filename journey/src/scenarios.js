// The website selects moments; the iPhone renders the traveller UI.
export const TRIGGER_GROUPS = [
  {
    label: "New · Your journey, your way",
    items: [
      {
        id: "prep-ready",
        label: "Your journey at a glance",
        scenario: "normal",
        modal: "prep-ready",
      },
      {
        id: "prepare",
        label: "Get ready for your journey",
        scenario: "normal",
        modal: "prepare",
      },
      {
        id: "prep-intent",
        label: "What matters today",
        scenario: "normal",
        modal: "prep-intent",
      },
      {
        id: "prep-transport",
        label: "Plan airport transport",
        scenario: "normal",
        modal: "prep-transport",
      },
      {
        id: "prep-family",
        label: "Family & support",
        scenario: "normal",
        modal: "prep-family",
      },
      {
        id: "prep-food",
        label: "Food along the way",
        scenario: "airport",
        modal: "prep-food",
      },
      {
        id: "prep-rest",
        label: "Rest around your arrival",
        scenario: "normal",
        modal: "prep-rest",
      },
      {
        id: "prep-media",
        label: "Your personal flight playlist",
        scenario: "airport",
        modal: "prep-media",
      },
      {
        id: "prep-onboard",
        label: "Preview onboard pairing",
        scenario: "airport",
        modal: "prep-onboard",
      },
      {
        id: "prep-arrival",
        label: "Preview arrival & pickup",
        scenario: "airport",
        modal: "prep-arrival",
      },
      {
        id: "prep-feedback",
        label: "End-of-journey feedback",
        scenario: "airport",
        modal: "prep-feedback",
      },
    ],
  },
  {
    label: "Real data",
    items: [
      {
        id: "live",
        label: "Call live integrations",
        scenario: "normal",
        modal: "live",
      },
    ],
  },
  {
    label: "Core screens",
    items: [
      { id: "home", label: "Homepage", scenario: "normal" },
      {
        id: "journey",
        label: "Open journey sheet",
        scenario: "normal",
        expanded: true,
      },
      { id: "pass", label: "Boarding pass", scenario: "normal", modal: "pass" },
      {
        id: "weather",
        label: "Weather outlook",
        scenario: "normal",
        modal: "weather",
      },
    ],
  },
  {
    label: "Travel updates",
    items: [
      {
        id: "gate",
        label: "Gate changes to 62",
        scenario: "gate",
        expanded: true,
      },
      {
        id: "directions",
        label: "Directions to the new gate",
        scenario: "gate",
        modal: "directions",
        expanded: true,
      },
      {
        id: "delay",
        label: "Departure delayed",
        scenario: "delay",
        expanded: true,
      },
      {
        id: "readiness",
        label: "Aircraft readiness update",
        scenario: "delay",
        modal: "readiness",
        expanded: true,
      },
      {
        id: "connection",
        label: "Connection becomes tight",
        scenario: "connection",
        modal: "connection",
      },
      {
        id: "cancelled",
        label: "Flight cancelled",
        scenario: "cancelled",
        expanded: true,
      },
      {
        id: "recovery",
        label: "Choose a recovery",
        scenario: "cancelled",
        modal: "recovery",
        expanded: true,
      },
      {
        id: "recovered",
        label: "Recovery selected",
        scenario: "cancelled",
        recovery: "business",
        modal: "recovery",
        expanded: true,
      },
    ],
  },
  {
    label: "Time before boarding",
    items: [
      {
        id: "lounge",
        label: "Your Cathay lounge",
        scenario: "airport",
        modal: "lounge",
        expanded: true,
      },
      {
        id: "places",
        label: "Airport dining & shops",
        scenario: "airport",
        modal: "places",
        expanded: true,
      },
      {
        id: "entertainment",
        label: "Choose music & movies",
        scenario: "airport",
        modal: "entertainment",
        expanded: true,
      },
      {
        id: "rest",
        label: "Jet lag & rest",
        scenario: "airport",
        modal: "rest",
        expanded: true,
      },
      {
        id: "documents",
        label: "Travel requirements",
        scenario: "normal",
        modal: "documents",
      },
      {
        id: "share",
        label: "Share the journey",
        scenario: "normal",
        modal: "share",
      },
      {
        id: "activity",
        label: "Live Activity",
        scenario: "normal",
        modal: "activity",
      },
    ],
  },
];
export const TRIGGERS = TRIGGER_GROUPS.flatMap((group) => group.items);
