import type { AppDeps } from "./app.js";
import { createNeonDb, type Database } from "./db/client.js";
import { FakeGroqClient } from "./llm/fake-groq-client.js";
import { RealGroqClient, type GroqClient } from "./llm/groq-client.js";
import {
  allowAllRateLimiter,
  createUpstashRateLimiter,
  type RateLimiter,
} from "./rate-limit/rate-limiter.js";

// The one place that decides real vs stand-in adapters. Production refuses
// to start without real credentials; anywhere else, missing credentials
// fall back to local stand-ins so the app runs with zero setup.
export async function resolveAppDeps(env: NodeJS.ProcessEnv = process.env): Promise<AppDeps> {
  const isProduction = env.NODE_ENV === "production";
  return {
    db: await resolveDb(env, isProduction),
    groq: resolveGroq(env, isProduction),
    rateLimiter: resolveRateLimiter(env, isProduction),
  };
}

async function resolveDb(env: NodeJS.ProcessEnv, isProduction: boolean): Promise<Database> {
  if (env.DATABASE_URL) return createNeonDb(env.DATABASE_URL);
  if (isProduction) throw new Error("DATABASE_URL is required in production");
  console.warn("DATABASE_URL not set: using in-memory Postgres (data is lost on restart)");
  const { createMemoryDb } = await import("./db/memory.js");
  return createMemoryDb();
}

function resolveGroq(env: NodeJS.ProcessEnv, isProduction: boolean): GroqClient {
  if (env.CHAT_GROQ_MODE === "fake") return new FakeGroqClient();
  if (env.GROQ_API_KEY) return new RealGroqClient(env.GROQ_API_KEY);
  if (isProduction) throw new Error("GROQ_API_KEY is required in production");
  console.warn("GROQ_API_KEY not set: using the fake Groq client");
  return new FakeGroqClient();
}

function resolveRateLimiter(env: NodeJS.ProcessEnv, isProduction: boolean): RateLimiter {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = env;
  if (url && token) return createUpstashRateLimiter(url, token);
  if (isProduction) throw new Error("UPSTASH_REDIS_REST_URL/TOKEN are required in production");
  console.warn("Upstash not configured: rate limiting disabled");
  return allowAllRateLimiter;
}
