import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildApp } from "./app.js";
import { createMemoryDb } from "./db/memory.js";
import { FakeGroqClient } from "./llm/fake-groq-client.js";
import { allowAllRateLimiter } from "./rate-limit/rate-limiter.js";

async function setup() {
  return buildApp({
    db: await createMemoryDb(),
    groq: new FakeGroqClient(),
    rateLimiter: allowAllRateLimiter,
  });
}

describe("app", () => {
  it("serves the health check", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { status: "ok" });
  });

  it("mounts ChatService under /api", async () => {
    const app = await setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/chat.v1.ChatService/ListConversations",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), {});
  });
});
