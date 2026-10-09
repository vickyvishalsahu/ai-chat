import "dotenv/config";

import { buildApp } from "./app.js";
import { resolveAppDeps } from "./compose.js";

const app = await buildApp(await resolveAppDeps());

try {
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
