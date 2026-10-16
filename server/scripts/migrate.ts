import "dotenv/config"
import { readFile } from "node:fs/promises"
import { Pool } from "pg"
import { readdir } from "node:fs/promises"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
try {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  )
  const files = (await readdir(new URL("../sql/", import.meta.url)))
    .filter((file) => file.endsWith(".sql"))
    .sort()
  for (const file of files) {
    const found = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      [file],
    )
    if (found.rowCount) continue
    await pool.query(
      await readFile(new URL(`../sql/${file}`, import.meta.url), "utf8"),
    )
    await pool.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [
      file,
    ])
    console.log(`Applied ${file}`)
  }
} finally {
  await pool.end()
}
