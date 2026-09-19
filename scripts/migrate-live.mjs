import { spawnSync } from "node:child_process";
const connection = process.env.SUPABASE_DB_URL;
if (!connection)
  throw new Error(
    "Set SUPABASE_DB_URL in .env.local. Do not paste it into chat.",
  );
const url = new URL(connection);
if (!["postgres:", "postgresql:"].includes(url.protocol))
  throw new Error("Expected a PostgreSQL connection URL");
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGSSLMODE: "require",
};
const result = spawnSync(
  "psql",
  [
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    "supabase/migrations/0002_live_integration.sql",
    "-f",
    "supabase/migrations/0003_government_connections.sql",
  ],
  { env, stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
