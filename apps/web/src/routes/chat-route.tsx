import { useParams } from "react-router";

import { ChatThread } from "@/features/chat/components/chat-thread";

export function ChatRoute() {
  const { conversationId } = useParams();
  if (!conversationId) throw new Error("chat route rendered without a conversationId");

  // Keyed so switching conversations resets the thread's local send state.
  return <ChatThread key={conversationId} conversationId={conversationId} />;
}
