import { useEffect, useRef } from "react";

import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";
import { useConversation } from "../api/use-conversation";
import { useSendMessage, type SendErrorKind } from "../api/use-send-message";

const ERROR_COPY: Record<SendErrorKind, string> = {
  "rate-limited": "You're sending messages too fast. Wait a moment, then try again.",
  "assistant-failed": "The assistant couldn't respond. Your message was saved.",
  "send-failed": "Your message couldn't be sent. Check your connection and try again.",
};

interface ChatThreadProps {
  conversationId: string;
}

export function ChatThread({ conversationId }: ChatThreadProps) {
  const conversation = useConversation(conversationId);
  const { state, send, retry, dismissError } = useSendMessage(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const cached = conversation.data?.messages ?? [];
  const cachedIds = new Set(cached.map((m) => m.id));
  const messages = [...cached, ...state.overlay.filter((m) => !cachedIds.has(m.id))];
  const isBusy = state.status === "sending" || state.status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, state.streamedText]);

  if (conversation.isPending) {
    return <p className="p-6 text-sm text-ink-muted">Loading conversation…</p>;
  }

  if (conversation.isError) {
    return (
      <div role="alert" className="flex items-center gap-3 p-6 text-sm text-danger">
        Couldn't load this conversation.
        <button type="button" className="underline" onClick={() => conversation.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-6">
        {messages.length === 0 && state.status === "idle" && (
          <p className="text-sm text-ink-muted">Say something to start the conversation.</p>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} role={message.role} content={message.content} />
        ))}

        {state.streamedText && (
          <MessageBubble
            role="assistant"
            content={state.streamedText}
            variant={state.status === "error" ? "failed" : "streaming"}
          />
        )}

        {state.error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
          >
            <span>{ERROR_COPY[state.error]}</span>
            {state.error !== "rate-limited" && (
              <button type="button" className="font-semibold underline" onClick={retry}>
                Try again
              </button>
            )}
            <button
              type="button"
              className="ml-auto"
              aria-label="Dismiss error"
              onClick={dismissError}
            >
              ×
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <Composer disabled={isBusy} onSend={send} />
    </div>
  );
}
