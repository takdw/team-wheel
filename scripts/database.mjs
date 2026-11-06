import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const remote = process.argv.includes("--remote");
const source = resolve(root, "dist/server/wrangler.json");
if (!existsSync(source)) {
  console.error("Build first with npm run build.");
  process.exit(1);
}
const config = JSON.parse(readFileSync(source, "utf8"));
config.d1_databases = [
  {
    binding: "DB",
    database_name: "team-wheel",
    database_id: remote
      ? process.env.CLOUDFLARE_D1_DATABASE_ID
      : config.d1_databases[0].database_id,
    migrations_dir: "../../drizzle",
  },
];
if (remote && !config.d1_databases[0].database_id) {
  console.error(
    "Set CLOUDFLARE_D1_DATABASE_ID to the database ID returned by wrangler d1 create team-wheel.",
  );
  process.exit(1);
}
const path = resolve(root, "dist/server/wrangler.migrations.json");
writeFileSync(path, JSON.stringify(config, null, 2));
const args = [
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js",
  "d1",
  "migrations",
  "apply",
  "DB",
  "--config",
  path,
  remote ? "--remote" : "--local",
];
if (!remote) args.push("--persist-to", ".wrangler/state");
const result = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
