import { Outlet } from "react-router";

import { useConversations } from "@/features/chat/api/use-conversations";
import { ConversationList } from "@/features/chat/components/conversation-list";
import { NewChatButton } from "@/features/chat/components/new-chat-button";

export function RootLayout() {
  const conversations = useConversations();

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="flex max-h-[40dvh] flex-col border-b border-line bg-surface md:max-h-none md:w-72 md:flex-none md:border-r md:border-b-0">
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <span className="font-display text-base font-extrabold tracking-tight">ai-testing</span>
          <NewChatButton />
        </div>
        <nav aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.isPending && <p className="px-3 py-2 text-sm text-ink-muted">Loading…</p>}
          {conversations.isError && (
            <p role="alert" className="px-3 py-2 text-sm text-danger">
              Couldn't load conversations.
            </p>
          )}
          {conversations.data && <ConversationList conversations={conversations.data} />}
        </nav>
      </aside>
      <main className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
