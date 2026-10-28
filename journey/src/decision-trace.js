const text = (value, max = 700) =>
  typeof value === "string" && value.length <= max;
const strings = (value) =>
  Array.isArray(value) && value.length <= 20 && value.every((x) => text(x));

export function tracePacket(plan, history, lookup) {
  const result = lookup?.result;
  const flight = result?.flights?.[0];
  // Do not spread journey, passenger, preferences, provider responses or tokens.
  return {
    version: 1,
    sentAt: new Date().toISOString(),
    plan,
    history: history.map(({ clock, title, reasons, previous }) => ({
      clock,
      title,
      reasons,
      previous,
    })),
    observation: flight
      ? {
          flight: `${flight.number} · ${flight.origin} → ${flight.destination}`,
          departure: flight.scheduledDeparture,
          status: flight.status,
          gate: flight.gate || "Not published",
          source: result.source,
          updatedAt: result.updatedAt,
          receivedAt: result.receivedAt,
          checkFailed: Boolean(lookup.error),
        }
      : null,
  };
}

export function validTrace(value) {
  const p = value?.plan;
  if (
    value?.version !== 1 ||
    !text(value.sentAt) ||
    !Number.isFinite(Date.parse(value.sentAt)) ||
    p?.version !== 1 ||
    !text(p.clock) ||
    !Number.isFinite(Date.parse(p.clock)) ||
    !text(p.status) ||
    !text(p.ruleVersion) ||
    !text(p.phase) ||
    !text(p.scenario) ||
    !text(p.action?.title) ||
    !text(p.action?.detail) ||
    !text(p.action?.id) ||
    !strings(p.reasons) ||
    !text(p.timing?.label) ||
    !Number.isFinite(p.timing?.availableMinutes) ||
    !Number.isFinite(p.timing?.walkMinutes) ||
    !Number.isFinite(p.timing?.bufferMinutes) ||
    !Array.isArray(p.inputs) ||
    p.inputs.length > 15 ||
    !p.inputs.every(
      (i) => i && text(i.label) && text(i.value) && text(i.source),
    ) ||
    !Array.isArray(p.options) ||
    p.options.length > 20 ||
    !p.options.every(
      (o) =>
        o &&
        text(o.id) &&
        text(o.title) &&
        typeof o.eligible === "boolean" &&
        strings(o.reasons),
    ) ||
    !Array.isArray(value.history) ||
    value.history.length > 30 ||
    !value.history.every(
      (h) =>
        h &&
        text(h.clock) &&
        text(h.title) &&
        strings(h.reasons) &&
        (h.previous === null || text(h.previous)),
    )
  )
    return false;
  const o = value.observation;
  return (
    o === null ||
    (o &&
      [
        "flight",
        "departure",
        "status",
        "gate",
        "source",
        "updatedAt",
        "receivedAt",
      ].every((k) => text(o[k])) &&
      typeof o.checkFailed === "boolean")
  );
}
