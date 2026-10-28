import test from "node:test";
import assert from "node:assert/strict";
import { createJourneyClient, JourneyAPIError } from "../client.mjs";
const id = "11111111-1111-4111-8111-111111111111";
const base = {
  url: "https://mekjqboywhbtbbabxela.supabase.co",
  publishableKey: "sb_publishable_test_only",
  getAccessToken: async () => "test-session",
};
test("public key and user session are separate; credentials never enter URL or cookies", async () => {
  let called;
  const c = createJourneyClient({
    ...base,
    fetchImpl: async (url, options) => {
      called = { url, options };
      return new Response(JSON.stringify({ journeyID: id }), { status: 200 });
    },
  });
  await c.create(id);
  assert.equal(called.url.pathname, "/rest/v1/rpc/journey_demo_create");
  assert.equal(called.url.search, "");
  assert.equal(called.options.headers.Authorization, "Bearer test-session");
  assert.equal(called.options.headers.apikey, base.publishableKey);
  assert.equal(called.options.credentials, "omit");
  assert.deepEqual(JSON.parse(called.options.body), { p_journey_id: id });
  assert.throws(() =>
    createJourneyClient({ ...base, publishableKey: "sb_secret_example" }),
  );
  assert.throws(() =>
    createJourneyClient({ ...base, url: "http://example.com" }),
  );
});
test("missing auth, conflicts and provider errors never silently become fixture success", async () => {
  let count = 0;
  const c = createJourneyClient({
    ...base,
    fetchImpl: async () => {
      count++;
      return new Response(
        JSON.stringify({ code: "PT409", message: "Journey changed" }),
        { status: 409 },
      );
    },
  });
  await assert.rejects(
    c.command({
      journeyID: id,
      commandID: id,
      expectedVersion: 2,
      type: "play",
    }),
    (e) => e instanceof JourneyAPIError && e.status === 409,
  );
  assert.equal(count, 1);
  const unauth = createJourneyClient({
    ...base,
    getAccessToken: async () => null,
    fetchImpl: () => {
      throw new Error("must not call");
    },
  });
  await assert.rejects(unauth.list(), (e) => e.code === "SESSION_REQUIRED");
});
test("network timeout aborts the request and invalid successful JSON is rejected", async () => {
  const c = createJourneyClient({
    ...base,
    timeoutMs: 5,
    fetchImpl: async (_u, o) =>
      new Promise((_, reject) =>
        o.signal.addEventListener("abort", () => reject(new Error("aborted"))),
      ),
  });
  await assert.rejects(c.list(), /aborted/);
  const bad = createJourneyClient({
    ...base,
    fetchImpl: async () => new Response("not json", { status: 200 }),
  });
  await assert.rejects(bad.list(), (e) => e.code === "INVALID_RESPONSE");
});
