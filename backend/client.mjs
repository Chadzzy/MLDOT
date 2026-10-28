// Supabase's built-in PostgREST RPC API; no service-role credential belongs here.
export class JourneyAPIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "JourneyAPIError";
    this.status = status;
    this.code = code;
  }
}
export function createJourneyClient({
  url,
  publishableKey,
  getAccessToken,
  fetchImpl = fetch,
  timeoutMs = 12000,
}) {
  const endpoint = new URL(url);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== "/"
  )
    throw new Error("Use the HTTPS Supabase project origin");
  if (
    typeof publishableKey !== "string" ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)
  )
    throw new Error(
      "A public sb_publishable_ key is required; never use a secret or service-role key",
    );
  if (typeof getAccessToken !== "function")
    throw new Error("An authenticated Supabase session is required");
  async function rpc(name, body) {
    const accessToken = await getAccessToken();
    if (typeof accessToken !== "string" || !accessToken)
      throw new JourneyAPIError("Sign in to continue", 401, "SESSION_REQUIRED");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(
        new URL(`/rest/v1/rpc/${name}`, endpoint),
        {
          method: "POST",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new JourneyAPIError(
          result?.message || "Journey service request failed",
          response.status,
          result?.code || "REQUEST_FAILED",
        );
      if (result === null)
        throw new JourneyAPIError(
          "Journey service returned an invalid response",
          502,
          "INVALID_RESPONSE",
        );
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }
  const uuid = (value) => {
    if (
      typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    )
      throw new Error("A UUID is required");
    return value;
  };
  return {
    create: (journeyID) =>
      rpc("journey_demo_create", { p_journey_id: uuid(journeyID) }),
    snapshot: (journeyID) =>
      rpc("journey_demo_snapshot", { p_journey_id: uuid(journeyID) }),
    list: () => rpc("journey_demo_list", {}),
    command: ({ journeyID, commandID, expectedVersion, type, args = {} }) => {
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
        throw new Error("Expected version must be a nonnegative integer");
      if (
        ![
          "set_mode",
          "play",
          "pause",
          "jump",
          "inject",
          "clear_event",
          "preferences",
        ].includes(type)
      )
        throw new Error("Unknown command");
      // Caller retains commandID until a response is known. Never silently retry a
      // conflict with a new version: another device's command may have changed intent.
      return rpc("journey_demo_command", {
        p_journey_id: uuid(journeyID),
        p_command_id: uuid(commandID),
        p_expected_version: expectedVersion,
        p_command: type,
        p_args: args,
      });
    },
  };
}
