import type { IncomingMessage, ServerResponse } from "node:http";

import { buildApp } from "../apps/server/src/app.js";
import { resolveAppDeps } from "../apps/server/src/compose.js";

async function createApp() {
  const app = await buildApp(await resolveAppDeps());
  await app.ready();
  return app;
}

// Reused across warm invocations; reset on failure so a bad cold start
// doesn't poison the instance.
let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  appPromise ??= createApp().catch((err: unknown) => {
    appPromise = undefined;
    throw err;
  });
  const app = await appPromise;
  app.server.emit("request", req, res);
}
