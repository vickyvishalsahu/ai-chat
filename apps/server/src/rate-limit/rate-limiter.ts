import { Code, ConnectError, createContextKey, type Interceptor } from "@connectrpc/connect";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimiter {
  limit(identifier: string): Promise<{ success: boolean }>;
}

export const clientIpKey = createContextKey<string>("anonymous", { description: "caller IP" });

const RATE_LIMITED_METHOD = "SendMessage";

export function createUpstashRateLimiter(url: string, token: string): RateLimiter {
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    prefix: "chat:send-message",
  });
}

export const allowAllRateLimiter: RateLimiter = {
  limit: async () => ({ success: true }),
};

// Rejects before the handler runs, so a rate-limited call emits zero chunks.
// The client relies on that to tell it apart from a mid-stream failure.
export function rateLimitInterceptor(limiter: RateLimiter): Interceptor {
  return (next) => async (req) => {
    if (req.method.name !== RATE_LIMITED_METHOD) return next(req);

    const { success } = await limiter.limit(req.contextValues.get(clientIpKey));
    if (!success) {
      throw new ConnectError("Rate limit exceeded, slow down.", Code.ResourceExhausted);
    }
    return next(req);
  };
}
