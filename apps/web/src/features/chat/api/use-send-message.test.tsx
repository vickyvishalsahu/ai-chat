import {
  MessageSchema,
  Role,
  SendMessageResponseSchema,
  type SendMessageResponse,
} from "@ai-testing/proto/chat/v1/chat_pb";
import { create } from "@bufbuild/protobuf";
import { Code, ConnectError } from "@connectrpc/connect";
import { act, waitFor } from "@testing-library/react";

import { chatClient } from "@/shared/api/connect-client";
import { createTestQueryClient, renderHookWithProviders } from "@/test/render";

import { conversationQueryKey, type ConversationData } from "./use-conversation";
import { useSendMessage } from "./use-send-message";

vi.mock("@/shared/api/connect-client", () => ({
  chatClient: { sendMessage: vi.fn() },
}));

const CONVERSATION_ID = "c1";

function message(id: string, role: Role, content: string) {
  return create(MessageSchema, { id, conversationId: CONVERSATION_ID, role, content });
}

const userAck = create(SendMessageResponseSchema, {
  payload: { case: "userMessage", value: message("u1", Role.USER, "hi") },
});
const delta = (value: string) =>
  create(SendMessageResponseSchema, { payload: { case: "contentDelta", value } });
const final = create(SendMessageResponseSchema, {
  payload: { case: "finalMessage", value: message("a1", Role.ASSISTANT, "Hello!") },
});

function streamOf(chunks: SendMessageResponse[], thenThrow?: Error) {
  vi.mocked(chatClient.sendMessage).mockImplementation(async function* () {
    for (const chunk of chunks) yield chunk;
    if (thenThrow) throw thenThrow;
  } as unknown as typeof chatClient.sendMessage);
}

function setup() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData<ConversationData>(conversationQueryKey(CONVERSATION_ID), {
    messages: [],
  });
  const hook = renderHookWithProviders(() => useSendMessage(CONVERSATION_ID), { queryClient });
  const cachedIds = () =>
    queryClient
      .getQueryData<ConversationData>(conversationQueryKey(CONVERSATION_ID))
      ?.messages.map((m) => m.id);
  return { ...hook, cachedIds };
}

describe("useSendMessage", () => {
  it("streams a reply and commits both messages to the cache", async () => {
    streamOf([userAck, delta("Hel"), delta("lo!"), final]);
    const { result, cachedIds } = setup();

    await act(() => result.current.send("hi"));

    expect(result.current.state).toMatchObject({ status: "idle", streamedText: "", error: null });
    expect(result.current.state.overlay.map((m) => m.id)).toEqual(["u1", "a1"]);
    expect(cachedIds()).toEqual(["u1", "a1"]);
  });

  it("rolls the user message back when rate-limited before the server acks it", async () => {
    streamOf([], new ConnectError("slow down", Code.ResourceExhausted));
    const { result, cachedIds } = setup();

    await act(() => result.current.send("hi"));

    expect(result.current.state).toMatchObject({ status: "error", error: "rate-limited" });
    expect(result.current.state.overlay).toEqual([]);
    expect(cachedIds()).toEqual([]);
  });

  it("keeps the acked user message when the assistant fails mid-stream", async () => {
    streamOf([userAck, delta("Hel")], new ConnectError("down", Code.Unavailable));
    const { result, cachedIds } = setup();

    await act(() => result.current.send("hi"));

    expect(result.current.state).toMatchObject({
      status: "error",
      error: "assistant-failed",
      streamedText: "Hel",
    });
    expect(cachedIds()).toEqual(["u1"]);
  });

  it("shows the optimistic message immediately, before the server responds", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    vi.mocked(chatClient.sendMessage).mockImplementation(async function* () {
      await gate;
      yield userAck;
    } as unknown as typeof chatClient.sendMessage);
    const { result } = setup();

    act(() => void result.current.send("hi"));

    await waitFor(() => expect(result.current.state.status).toBe("sending"));
    expect(result.current.state.overlay[0]).toMatchObject({ role: "user", content: "hi" });

    await act(async () => release());
  });
});
