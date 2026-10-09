# ai-testing

A multi-conversation AI chat playground. React on the front, Fastify and Connect-RPC on the back, replies streamed from Groq, conversations in Postgres.

## Run it

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173. No accounts are needed locally: without credentials the server uses an in-memory database and a scripted fake LLM. To talk to a real model, copy `apps/server/.env.example` to `apps/server/.env` and fill in the keys you have.

## Deploy

The repo deploys to Vercel as one project: the static web build plus a serverless function at `api/[[...path]].ts`. Set `DATABASE_URL`, `GROQ_API_KEY`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the Vercel project settings, then run the Neon migrations once with `pnpm --filter @ai-testing/server db:migrate`.

See `CLAUDE.md` for how the code is organised.
