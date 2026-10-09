import Groq from "groq-sdk";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqClient {
  streamChatCompletion(messages: ChatMessage[]): AsyncIterable<string>;
}

const MODEL = "llama-3.3-70b-versatile";

export class RealGroqClient implements GroqClient {
  private readonly client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async *streamChatCompletion(messages: ChatMessage[]): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: MODEL,
      messages,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
