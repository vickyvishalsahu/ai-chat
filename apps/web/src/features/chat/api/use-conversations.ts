import { useQuery } from "@tanstack/react-query";

import { chatClient } from "@/shared/api/connect-client";

import { fromProtoConversation } from "./mappers";

export const conversationsQueryKey = ["conversations"] as const;

export function useConversations() {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: async () => {
      const { conversations } = await chatClient.listConversations({});
      return conversations.map(fromProtoConversation);
    },
  });
}
