import { Code, ConnectError } from "@connectrpc/connect";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { chatClient } from "@/shared/api/connect-client";

import { fromProtoMessage, type ChatMessage } from "./mappers";
import { conversationQueryKey, type ConversationData } from "./use-conversation";
import { conversationsQueryKey } from "./use-conversations";

export type SendErrorKind = "rate-limited" | "assistant-failed" | "send-failed";

export interface SendMessageState {
  status: "idle" | "sending" | "streaming" | "error";
  // Messages known locally that the query cache may not have rendered yet.
  // Callers de-duplicate against the cache by id, so a message is never
  // missing or doubled while the cache catches up.
  overlay: ChatMessage[];
  streamedText: string;
  error: SendErrorKind | null;
}

const IDLE: SendMessageState = { status: "idle", overlay: [], streamedText: "", error: null };

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SendMessageState>(IDLE);
  const inFlight = useRef(false);
  const lastContent = useRef("");

  const appendToCache = useCallback(
    (newMessages: ChatMessage[]) => {
      queryClient.setQueryData<ConversationData>(conversationQueryKey(conversationId), (prev) => {
        if (!prev) return prev;
        const known = new Set(prev.messages.map((m) => m.id));
        return { messages: [...prev.messages, ...newMessages.filter((m) => !known.has(m.id))] };
      });
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
    [conversationId, queryClient],
  );

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || inFlight.current) return;
      inFlight.current = true;
      lastContent.current = text;

      const optimistic: ChatMessage = {
        id: `pending-${crypto.randomUUID()}`,
        conversationId,
        role: "user",
        content: text,
        createdAt: new Date(),
      };
      setState({ status: "sending", overlay: [optimistic], streamedText: "", error: null });

      let confirmed: ChatMessage | null = null;
      try {
        for await (const chunk of chatClient.sendMessage({ conversationId, content: text })) {
          const { payload } = chunk;
          if (payload.case === "userMessage") {
            confirmed = fromProtoMessage(payload.value);
            appendToCache([confirmed]);
            setState((s) => ({ ...s, status: "streaming", overlay: [confirmed!] }));
          } else if (payload.case === "contentDelta") {
            const delta = payload.value;
            setState((s) => ({ ...s, streamedText: s.streamedText + delta }));
          } else if (payload.case === "finalMessage") {
            const assistant = fromProtoMessage(payload.value);
            appendToCache([assistant]);
            setState({ ...IDLE, overlay: confirmed ? [confirmed, assistant] : [assistant] });
          }
        }
      } catch (err) {
        // Whether the server acked the user message decides rollback vs keep,
        // not the error code.
        setState((s) => ({
          status: "error",
          overlay: confirmed ? [confirmed] : [],
          streamedText: confirmed ? s.streamedText : "",
          error: classifyError(err, confirmed !== null),
        }));
      } finally {
        inFlight.current = false;
      }
    },
    [appendToCache, conversationId],
  );

  const retry = useCallback(() => send(lastContent.current), [send]);
  const dismissError = useCallback(
    () => setState((s) => ({ ...s, status: "idle", streamedText: "", error: null })),
    [],
  );

  return { state, send, retry, dismissError };
}

function classifyError(err: unknown, acked: boolean): SendErrorKind {
  if (err instanceof ConnectError && err.code === Code.ResourceExhausted) return "rate-limited";
  return acked ? "assistant-failed" : "send-failed";
}
