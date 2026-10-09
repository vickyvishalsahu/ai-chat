import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { ChatService, Role, type SendMessageChunk } from "@ai-testing/proto/chat/v1/chat_pb";
import { Code, ConnectError, createClient, createRouterTransport } from "@connectrpc/connect";

import { createChatService, deriveTitle } from "./chat.js";
import { createMemoryDb } from "../db/memory.js";
import { FakeGroqClient, type ScriptedReply } from "../llm/fake-groq-client.js";

async function setup(replies: Array<ScriptedReply | Error> = []) {
  const db = await createMemoryDb();
  const groq = new FakeGroqClient(replies);
  const transport = createRouterTransport((router) =>
    router.service(ChatService, createChatService({ db, groq })),
  );
  return createClient(ChatService, transport);
}

async function collect(stream: AsyncIterable<SendMessageChunk>, into: SendMessageChunk[] = []) {
  for await (const chunk of stream) into.push(chunk);
  return into;
}

function hasCode(code: Code) {
  return (err: unknown) => err instanceof ConnectError && err.code === code;
}

describe("ChatService", () => {
  it("creates a conversation on first send, streams the reply, and persists both messages", async () => {
    const client = await setup([{ tokens: ["Hi", " there", "!"] }]);
    const conversationId = randomUUID();

    const chunks = await collect(client.sendMessage({ conversationId, content: "hello" }));

    assert.deepEqual(
      chunks.map((c) => c.payload.case),
      ["userMessage", "contentDelta", "contentDelta", "contentDelta", "finalMessage"],
    );
    const final = chunks.at(-1)!.payload;
    assert.equal(final.case === "finalMessage" && final.value.content, "Hi there!");

    const { conversation, messages } = await client.getConversation({ conversationId });
    assert.equal(conversation?.title, "hello");
    assert.deepEqual(
      messages.map((m) => [m.role, m.content]),
      [
        [Role.USER, "hello"],
        [Role.ASSISTANT, "Hi there!"],
      ],
    );

    const { conversations } = await client.listConversations({});
    assert.deepEqual(
      conversations.map((c) => c.id),
      [conversationId],
    );
  });

  it("keeps the user message when Groq fails mid-stream and reports Unavailable", async () => {
    const client = await setup([new Error("groq is down")]);
    const conversationId = randomUUID();
    const chunks: SendMessageChunk[] = [];

    await assert.rejects(
      collect(client.sendMessage({ conversationId, content: "hello" }), chunks),
      hasCode(Code.Unavailable),
    );

    assert.deepEqual(
      chunks.map((c) => c.payload.case),
      ["userMessage"],
    );
    const { messages } = await client.getConversation({ conversationId });
    assert.deepEqual(
      messages.map((m) => m.role),
      [Role.USER],
    );
  });

  it("only derives the title from the first message", async () => {
    const client = await setup();
    const conversationId = randomUUID();

    await collect(client.sendMessage({ conversationId, content: "first question" }));
    await collect(client.sendMessage({ conversationId, content: "follow-up" }));

    const { conversation, messages } = await client.getConversation({ conversationId });
    assert.equal(conversation?.title, "first question");
    assert.equal(messages.length, 4);
  });

  it("returns NotFound for a conversation nothing has been sent to yet", async () => {
    const client = await setup();
    await assert.rejects(
      client.getConversation({ conversationId: randomUUID() }),
      hasCode(Code.NotFound),
    );
  });

  it("rejects non-UUID ids and empty content", async () => {
    const client = await setup();
    await assert.rejects(
      client.getConversation({ conversationId: "not-a-uuid" }),
      hasCode(Code.InvalidArgument),
    );
    await assert.rejects(
      collect(client.sendMessage({ conversationId: randomUUID(), content: "   " })),
      hasCode(Code.InvalidArgument),
    );
  });
});

describe("deriveTitle", () => {
  it("collapses whitespace and truncates long messages", () => {
    assert.equal(deriveTitle("  hello\n  world "), "hello world");
    assert.equal(deriveTitle("a".repeat(50)), `${"a".repeat(40)}…`);
  });
});
