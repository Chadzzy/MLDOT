import { BASE_JOURNEY } from "./data.js";

// All UI consumers use this shape. A future server adapter can replace the fixture
// without giving browser code provider API keys or changing the scenario overlay.
export function validateSnapshot(value) {
  if (
    !value ||
    !value.flight ||
    !value.passenger ||
    !Array.isArray(value.weather) ||
    !value.provenance
  )
    throw new Error("Journey response is incomplete.");
  if (!["demo", "live", "replay"].includes(value.provenance.kind))
    throw new Error("Journey response must identify its provenance.");
  for (const field of ["departure", "arrival", "boarding", "cutoff"]) {
    if (!Number.isFinite(Date.parse(value.flight[field])))
      throw new Error(`Invalid flight ${field}.`);
  }
  for (const field of [
    "number",
    "origin",
    "destination",
    "originZone",
    "destinationZone",
  ]) {
    if (typeof value.flight[field] !== "string" || !value.flight[field])
      throw new Error(`Missing flight ${field}.`);
  }
  return value;
}

export const demoProvider = {
  id: "demo",
  async getSnapshot() {
    return {
      data: validateSnapshot(structuredClone(BASE_JOURNEY)),
      evidence: {
        transport: "local",
        provider: "Local fixture adapter",
        loadedAt: new Date().toISOString(),
        networkRequests: 0,
        note: "Read from bundled sample data. No external API was called.",
      },
    };
  },
};

// Explicit opt-in for a future same-origin server. This adapter is not enabled
// by the prototype and does not manufacture a successful response on failure.
export function createHttpProvider(endpoint, fetcher = fetch) {
  return {
    id: "http",
    async getSnapshot() {
      const response = await fetcher(endpoint, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok)
        throw new Error(`Journey service returned ${response.status}.`);
      const envelope = await response.json();
      return {
        data: validateSnapshot(envelope.data),
        evidence: {
          ...envelope.evidence,
          transport: "http",
          loadedAt: new Date().toISOString(),
          httpStatus: response.status,
        },
      };
    },
  };
}
