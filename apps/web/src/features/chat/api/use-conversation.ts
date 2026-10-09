import { Code, ConnectError } from "@connectrpc/connect";
import { useQuery } from "@tanstack/react-query";

import { chatClient } from "@/shared/api/connect-client";

import { fromProtoMessage, type ChatMessage } from "./mappers";

export interface ConversationData {
  messages: ChatMessage[];
}

export function conversationQueryKey(conversationId: string) {
  return ["conversation", conversationId] as const;
}

// NotFound means nothing has been sent to this id yet; that is an ordinary
// empty thread, so it is absorbed here and never reaches a component.
export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: conversationQueryKey(conversationId),
    queryFn: async (): Promise<ConversationData> => {
      try {
        const { messages } = await chatClient.getConversation({ conversationId });
        return { messages: messages.map(fromProtoMessage) };
      } catch (err) {
        if (err instanceof ConnectError && err.code === Code.NotFound) return { messages: [] };
        throw err;
      }
    },
  });
}
