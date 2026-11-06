import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
if (!databaseId || !/^[0-9a-f-]{36}$/i.test(databaseId)) {
  console.error(
    "Set CLOUDFLARE_D1_DATABASE_ID to your D1 database UUID. See README.md for the one-time setup.",
  );
  process.exit(1);
}
function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(["scripts/run-framework.mjs", "build"]);
const config = JSON.parse(
  readFileSync(resolve(root, "dist/server/wrangler.json"), "utf8"),
);
config.name = process.env.CLOUDFLARE_WORKER_NAME || "team-wheel";
config.topLevelName = config.name;
config.vars = {}; // Independent hosting always requires TEAM_PASSWORD; Sites identity is not trusted here.
config.workers_dev = true;
config.d1_databases = [
  {
    binding: "DB",
    database_name: "team-wheel",
    database_id: databaseId,
    migrations_dir: "../../drizzle",
  },
];
const path = resolve(root, "dist/server/wrangler.cloudflare.json");
writeFileSync(path, JSON.stringify(config, null, 2));
const wrangler = [
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js",
];
if (process.argv.includes("--dry-run")) {
  run([...wrangler, "deploy", "--config", path, "--dry-run"]);
} else {
  run([
    ...wrangler,
    "d1",
    "migrations",
    "apply",
    "DB",
    "--remote",
    "--config",
    path,
  ]);
  run([...wrangler, "deploy", "--config", path]);
  console.log(
    "Share the workers.dev URL after setting TEAM_PASSWORD. Username: team. See README.md.",
  );
}
