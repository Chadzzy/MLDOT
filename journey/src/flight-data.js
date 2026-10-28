// Public passenger lookup, observed through Cathay's normal flight-status form.
// This is an experimental website service, not a contracted developer API.
export const FLIGHT_SOURCE = {
  name: "Cathay Pacific · flight status",
  page: "https://www.cathaypacific.com/cx/en_HK/prepare-trip/flight-status.html",
  endpoint:
    "https://api.cathaypacific.com/flightinformation/flight-status/olss-flight-status/v5.0/flightStatusByFlightNumber",
};
export function flightQuery(number, date) {
  const match = String(number)
    .trim()
    .toUpperCase()
    .match(/^(?:CX\s*)?([1-9]\d{0,3})$/);
  if (!match)
    throw new Error("Enter a Cathay flight number, for example CX383.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
    new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date
  )
    throw new Error("Choose a valid departure date.");
  return {
    travelDate: date,
    carrierCode: "CX",
    flightNumber: match[1],
    locale: "en_HK",
    departureArrival: "D",
  };
}
function timestamp(local, offset, required = false) {
  if (local == null || local === "") {
    if (required) throw new Error("Flight schedule time is missing.");
    return null;
  }
  if (
    !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(local) ||
    !/^[+-]\d{4}$/.test(offset || "")
  )
    throw new Error("Flight time or UTC offset is invalid.");
  const value = Date.parse(
    local.replace(" ", "T") + offset.slice(0, 3) + ":" + offset.slice(3),
  );
  if (!Number.isFinite(value)) throw new Error("Flight time is invalid.");
  return new Date(value).toISOString();
}
export function estimatedBoarding(departure) {
  const std = Date.parse(departure);
  if (!Number.isFinite(std))
    throw new Error("Scheduled departure is required for a boarding estimate.");
  return {
    boarding: new Date(std - 40 * 60000).toISOString(),
    cutoff: new Date(std - 20 * 60000).toISOString(),
    kind: "estimated",
    basis:
      "Scheduled departure minus 40 min; gate-close estimate minus 20 min. Demo planning rules, not reported boarding times.",
  };
}
export function parseFlightStatus(
  payload,
  query,
  receivedAt = new Date().toISOString(),
) {
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.errors ||
    !Array.isArray(payload.result)
  )
    throw new Error(
      "Cathay could not return flight information for this search.",
    );
  const updatedAt = timestamp(payload.lastUpdateGMT, "+0000", true);
  const flights = [];
  for (const item of payload.result) {
    if (
      item.operatingFlight?.carrierCode !== query.carrierCode ||
      String(Number(item.operatingFlight.flightNumber)) !==
        query.flightNumber ||
      !Array.isArray(item.sectors)
    )
      throw new Error("The flight response does not match this search.");
    for (const s of item.sectors) {
      if (
        !/^[A-Z]{3}$/.test(s.origin || "") ||
        !/^[A-Z]{3}$/.test(s.destination || "") ||
        typeof s.flightStatus !== "string"
      )
        throw new Error("The flight response is missing its route or status.");
      const scheduledDeparture = timestamp(
        s.departScheduled,
        s.originScheduledOffset,
        true,
      );
      const scheduledArrival = timestamp(
        s.arrivalScheduled,
        s.destinationScheduledOffset,
        true,
      );
      flights.push({
        id: `${query.carrierCode}${query.flightNumber}-${s.origin}-${scheduledDeparture}`,
        number: `${query.carrierCode}${query.flightNumber}`,
        origin: s.origin,
        destination: s.destination,
        scheduledDeparture,
        scheduledArrival,
        estimatedDeparture: timestamp(
          s.departEstimated,
          s.originEstimatedOffset,
        ),
        actualDeparture: timestamp(s.departActual, s.originActualOffset),
        estimatedArrival: timestamp(
          s.arrivalEstimated,
          s.destinationEstimatedOffset,
        ),
        actualArrival: timestamp(s.arrivalActual, s.destinationActualOffset),
        departureLocal: s.departScheduled,
        arrivalLocal: s.arrivalScheduled,
        departureOffset: s.originScheduledOffset,
        arrivalOffset: s.destinationScheduledOffset,
        actualDepartureOffset: s.originActualOffset,
        estimatedDepartureOffset: s.originEstimatedOffset,
        actualArrivalOffset: s.destinationActualOffset,
        estimatedArrivalOffset: s.destinationEstimatedOffset,
        status: s.flightStatus,
        gate:
          typeof s.gateNumber === "string" && s.gateNumber.trim()
            ? s.gateNumber.trim()
            : null,
        terminal: s.departTerminalShortName || s.terminalName || null,
        aircraft: s.aircraftType || null,
        boarding: estimatedBoarding(scheduledDeparture),
      });
    }
  }
  return { flights, updatedAt, receivedAt, query, source: FLIGHT_SOURCE.name };
}
export function flightFreshness(result, now = Date.now()) {
  if (!result) return "unavailable";
  const ages = [
    now - Date.parse(result.updatedAt),
    now - Date.parse(result.receivedAt),
  ];
  if (ages.some((age) => !Number.isFinite(age))) return "unavailable";
  if (ages.some((age) => age < -60000)) return "clock mismatch";
  return ages.some((age) => age > 5 * 60000) ? "last update" : "current";
}
export async function requestFlightStatus(query) {
  if (window.webkit?.messageHandlers?.journey) {
    return new Promise((resolve, reject) => {
      const requestID = crypto.randomUUID();
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("journey-flight-result", receive);
      };
      const receive = (event) => {
        if (event.detail?.requestID !== requestID) return;
        cleanup();
        if (event.detail.error) reject(new Error(event.detail.error));
        else resolve(event.detail);
      };
      window.addEventListener("journey-flight-result", receive);
      timer = setTimeout(() => {
        cleanup();
        reject(new Error("The flight lookup timed out. Try again shortly."));
      }, 16000);
      try {
        window.webkit.messageHandlers.journey.postMessage({
          type: "flightLookup",
          requestID,
          query,
        });
      } catch {
        cleanup();
        reject(new Error("The native flight connection is unavailable."));
      }
    });
  }
  if (!import.meta.env?.DEV)
    throw new Error(
      "Open this flight lookup in the iPhone app. The static preview cannot call Cathay’s website service directly.",
    );
  const response = await fetch("/api/journey-flight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(16000),
  });
  const result = await response.json();
  if (!response.ok || result.error)
    throw new Error(result.error || "Flight lookup failed.");
  return result;
}
