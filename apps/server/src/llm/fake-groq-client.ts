import type { ChatMessage, GroqClient } from "./groq-client.js";

export interface ScriptedReply {
  tokens: string[];
  delayMs?: number;
}

const DEFAULT_REPLY: ScriptedReply = {
  tokens: ["This", " is", " a", " fake", " reply", " for", " tests."],
};

// Deterministic stand-in for Groq; never touches the network.
export class FakeGroqClient implements GroqClient {
  private readonly queue: Array<ScriptedReply | Error>;

  constructor(initial: Array<ScriptedReply | Error> = []) {
    this.queue = [...initial];
  }

  async *streamChatCompletion(_messages: ChatMessage[]): AsyncIterable<string> {
    const next = this.queue.shift() ?? DEFAULT_REPLY;
    if (next instanceof Error) throw next;
    for (const token of next.tokens) {
      if (next.delayMs) await new Promise((resolve) => setTimeout(resolve, next.delayMs));
      yield token;
    }
  }
}
