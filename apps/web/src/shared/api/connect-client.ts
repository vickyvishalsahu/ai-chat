import { ChatService } from "@ai-testing/proto/chat/v1/chat_pb";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

// Same-origin everywhere: Vite proxies /api to the server in dev, and the
// Vercel function serves /api in production.
const transport = createConnectTransport({ baseUrl: "/api" });

export const chatClient = createClient(ChatService, transport);
