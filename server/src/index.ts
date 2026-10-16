import "dotenv/config"
import { Pool } from "pg"
import { buildApp } from "./app.js"
import { PgRepository } from "./pg-repository.js"

const port = Number(process.env.API_PORT ?? 8787)
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("DATABASE_URL is required to start the MOVI API.")
  process.exit(1)
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DB_POOL_SIZE ?? 10),
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
})
const repository = new PgRepository(pool)
const app = buildApp(repository, {
  secureCookies: process.env.NODE_ENV === "production",
})

const shutdown = async () => {
  await app.close()
  await repository.close()
  process.exit(0)
}

process.once("SIGINT", shutdown)
process.once("SIGTERM", shutdown)

await app.listen({ port, host: process.env.API_HOST ?? "0.0.0.0" })
console.log(`MOVI API listening on http://localhost:${port}`)
