import { ChatService } from "@ai-testing/proto/chat/v1/chat_pb";
import { createContextValues } from "@connectrpc/connect";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";
import Fastify from "fastify";

import { createChatService, type ChatServiceDeps } from "./connect/chat.js";
import { clientIpKey, rateLimitInterceptor, type RateLimiter } from "./rate-limit/rate-limiter.js";

export interface AppDeps extends ChatServiceDeps {
  rateLimiter: RateLimiter;
}

export async function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.register(fastifyConnectPlugin, {
    prefix: "/api",
    interceptors: [rateLimitInterceptor(deps.rateLimiter)],
    contextValues: (req) => createContextValues().set(clientIpKey, req.ip),
    routes: (router) => router.service(ChatService, createChatService(deps)),
  });

  return app;
}
