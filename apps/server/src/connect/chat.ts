import {
  ChatService,
  ConversationSchema,
  GetConversationResponseSchema,
  ListConversationsResponseSchema,
  MessageSchema,
  Role,
  SendMessageChunkSchema,
} from "@ai-testing/proto/chat/v1/chat_pb";
import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { desc, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { conversations, DEFAULT_CONVERSATION_TITLE, messages } from "../db/schema.js";
import type { ChatMessage, GroqClient } from "../llm/groq-client.js";

const SYSTEM_PROMPT = "You are a helpful, concise assistant.";
const MAX_HISTORY_MESSAGES = 20;
const MAX_RETURNED_MESSAGES = 200;
const TITLE_MAX_LENGTH = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ConversationRow = typeof conversations.$inferSelect;
type MessageRow = typeof messages.$inferSelect;

export interface ChatServiceDeps {
  db: Database;
  groq: GroqClient;
}

export function createChatService({ db, groq }: ChatServiceDeps): ServiceImpl<typeof ChatService> {
  return {
    async listConversations() {
      const rows = await db.select().from(conversations).orderBy(desc(conversations.updatedAt));
      return create(ListConversationsResponseSchema, {
        conversations: rows.map(toProtoConversation),
      });
    },

    async getConversation(req) {
      assertUuid(req.conversationId);
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, req.conversationId));
      if (!conversation) {
        throw new ConnectError(`conversation ${req.conversationId} not found`, Code.NotFound);
      }

      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(MAX_RETURNED_MESSAGES);

      return create(GetConversationResponseSchema, {
        conversation: toProtoConversation(conversation),
        messages: rows.reverse().map(toProtoMessage),
      });
    },

    async *sendMessage(req) {
      const content = req.content.trim();
      if (!content) {
        throw new ConnectError("message content must not be empty", Code.InvalidArgument);
      }
      assertUuid(req.conversationId);

      const conversation = await upsertConversation(db, req.conversationId);

      const [userMessage] = await db
        .insert(messages)
        .values({ conversationId: conversation.id, role: "user", content })
        .returning();

      if (conversation.title === DEFAULT_CONVERSATION_TITLE) {
        await db
          .update(conversations)
          .set({ title: deriveTitle(content) })
          .where(eq(conversations.id, conversation.id));
      }

      // From here on the user's message is durable; any later failure is
      // assistant-side and the client must not roll the message back.
      yield create(SendMessageChunkSchema, {
        payload: { case: "userMessage", value: toProtoMessage(userMessage) },
      });

      const history = await buildHistory(db, conversation.id);

      let reply = "";
      try {
        for await (const delta of groq.streamChatCompletion(history)) {
          reply += delta;
          yield create(SendMessageChunkSchema, {
            payload: { case: "contentDelta", value: delta },
          });
        }
      } catch (err) {
        console.error("groq stream failed", err);
        throw new ConnectError(
          "The assistant failed to respond; your message was saved.",
          Code.Unavailable,
        );
      }

      if (!reply.trim()) {
        throw new ConnectError("The assistant returned an empty response.", Code.Unavailable);
      }

      const [assistantMessage] = await db
        .insert(messages)
        .values({ conversationId: conversation.id, role: "assistant", content: reply })
        .returning();
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id));

      yield create(SendMessageChunkSchema, {
        payload: { case: "finalMessage", value: toProtoMessage(assistantMessage) },
      });
    },
  };
}

function assertUuid(id: string) {
  if (!UUID_RE.test(id)) {
    throw new ConnectError("conversation_id must be a UUID", Code.InvalidArgument);
  }
}

// Insert-first so two tabs racing on a brand-new id can't hit a PK violation.
async function upsertConversation(db: Database, id: string): Promise<ConversationRow> {
  const [created] = await db.insert(conversations).values({ id }).onConflictDoNothing().returning();
  if (created) return created;

  const [existing] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!existing) throw new ConnectError("failed to resolve conversation", Code.Internal);
  return existing;
}

async function buildHistory(db: Database, conversationId: string): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(MAX_HISTORY_MESSAGES);

  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...rows.reverse().map((row) => ({ role: row.role, content: row.content })),
  ];
}

export function deriveTitle(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length <= TITLE_MAX_LENGTH
    ? normalized
    : `${normalized.slice(0, TITLE_MAX_LENGTH).trimEnd()}…`;
}

const ROLE_TO_PROTO = { user: Role.USER, assistant: Role.ASSISTANT, system: Role.SYSTEM } as const;

function toProtoMessage(row: MessageRow) {
  return create(MessageSchema, {
    id: row.id,
    conversationId: row.conversationId,
    role: ROLE_TO_PROTO[row.role],
    content: row.content,
    createdAt: timestampFromDate(row.createdAt),
  });
}

function toProtoConversation(row: ConversationRow) {
  return create(ConversationSchema, {
    id: row.id,
    title: row.title,
    createdAt: timestampFromDate(row.createdAt),
    updatedAt: timestampFromDate(row.updatedAt),
  });
}
