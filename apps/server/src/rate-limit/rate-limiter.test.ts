import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { ChatService, type SendMessageChunk } from "@ai-testing/proto/chat/v1/chat_pb";
import { Code, ConnectError, createClient, createRouterTransport } from "@connectrpc/connect";

import { rateLimitInterceptor, type RateLimiter } from "./rate-limiter.js";
import { createChatService } from "../connect/chat.js";
import { createMemoryDb } from "../db/memory.js";
import { FakeGroqClient } from "../llm/fake-groq-client.js";

const denyAll: RateLimiter = { limit: async () => ({ success: false }) };

describe("rateLimitInterceptor", () => {
  it("rejects SendMessage before any chunk is emitted, and leaves other RPCs alone", async () => {
    const db = await createMemoryDb();
    const transport = createRouterTransport(
      (router) =>
        router.service(ChatService, createChatService({ db, groq: new FakeGroqClient() })),
      { router: { interceptors: [rateLimitInterceptor(denyAll)] } },
    );
    const client = createClient(ChatService, transport);
    const chunks: SendMessageChunk[] = [];

    await assert.rejects(
      (async () => {
        for await (const chunk of client.sendMessage({
          conversationId: randomUUID(),
          content: "hi",
        })) {
          chunks.push(chunk);
        }
      })(),
      (err) => err instanceof ConnectError && err.code === Code.ResourceExhausted,
    );
    assert.equal(chunks.length, 0);

    const { conversations } = await client.listConversations({});
    assert.equal(conversations.length, 0);
  });
});
