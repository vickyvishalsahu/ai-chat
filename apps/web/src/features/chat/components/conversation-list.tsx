import { NavLink } from "react-router";

import { cn } from "@/shared/lib/cn";

import type { ChatConversation } from "../api/mappers";

interface ConversationListProps {
  conversations: ChatConversation[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return <p className="px-3 py-2 text-sm text-ink-muted">No conversations yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <NavLink
            to={`/chat/${conversation.id}`}
            className={({ isActive }) =>
              cn(
                "block truncate rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-canvas",
                isActive && "bg-accent-soft hover:bg-accent-soft",
              )
            }
          >
            {conversation.title}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
