export const PREPARATION_OPTIONS = {
  intent: ["easy", "rest", "enjoy"],
  transport: ["rail", "car", "dropoff", "undecided"],
  family: ["yes", "no"],
  assistance: ["none", "walking", "discuss"],
  meal: ["standard", "vegetarian", "later"],
  rest: ["settle", "flexible", "awake"],
  feedback: ["yes", "partly", "no"],
};
export function preparationState(raw = {}) {
  if (!raw || typeof raw !== "object") raw = {};
  return {
    ...Object.fromEntries(
      Object.entries(PREPARATION_OPTIONS).map(([key, values]) => [
        key,
        values.includes(raw[key]) ? raw[key] : null,
      ]),
    ),
    buggy: raw.family === "yes" && raw.buggy === true,
    feedbackDetail:
      typeof raw.feedbackDetail === "string"
        ? raw.feedbackDetail.slice(0, 300)
        : "",
    feedbackSent:
      raw.feedbackSent === true &&
      PREPARATION_OPTIONS.feedback.includes(raw.feedback),
  };
}
export const intentLabel = (value) =>
  ({ easy: "Keep it easy", rest: "Arrive rested", enjoy: "Enjoy the journey" })[
    value
  ] || "What matters to you?";
export const transportLabel = (value) =>
  ({
    rail: "Airport Express",
    car: "Taxi or ride",
    dropoff: "Being dropped off",
    undecided: "Decide later",
  })[value] || "Getting to the airport";
export const transportAllowance = (value) =>
  ({ rail: 45, car: 35, dropoff: 35 })[value] || null;
