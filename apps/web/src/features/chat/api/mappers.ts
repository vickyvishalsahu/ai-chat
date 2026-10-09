import {
  Role,
  type Conversation as ProtoConversation,
  type Message as ProtoMessage,
} from "@ai-testing/proto/chat/v1/chat_pb";
import { timestampDate } from "@bufbuild/protobuf/wkt";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ChatConversation {
  id: string;
  title: string;
  updatedAt: Date;
}

export function fromProtoMessage(message: ProtoMessage): ChatMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role === Role.USER ? "user" : "assistant",
    content: message.content,
    createdAt: message.createdAt ? timestampDate(message.createdAt) : new Date(),
  };
}

export function fromProtoConversation(conversation: ProtoConversation): ChatConversation {
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt ? timestampDate(conversation.updatedAt) : new Date(),
  };
}
