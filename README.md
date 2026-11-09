# Team Wheel

A shared team wheel with random and balanced selection, per-person counters, custom colors, profile photos, and persistent pick history. Built with TypeScript, React, Vinext, Cloudflare Workers, and D1 (hosted SQLite).

## Run locally

Requires Node.js 24 LTS and npm. No Cloudflare account is needed for local development.

```sh
npm ci
npm run build
npm run db:migrate:local
npm run dev
```

Open the Local URL printed by the server (normally http://localhost:5173). If that port is busy, run `npm run dev -- --port 5187`. Add your team's names in the interface. The local roster starts empty and persists in `.wrangler/state/`. Production has its own separate database.

After changing the schema, use `npm run db:generate`, inspect the generated SQL, rebuild, and run `npm run db:migrate:local`. Applied migrations are immutable.

## Deploy on Cloudflare's free plan

Workers hosts the app; D1 stores the shared team data. Cloudflare supplies an HTTPS `workers.dev` address, so buying a domain is optional. The free plan currently includes 100,000 dynamic Worker requests/day and D1 allowances of 5 million rows read/day, 100,000 rows written/day, and 5 GB total storage. Account limits apply; check the official pricing before deployment:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/

One-time setup, from this directory:

```sh
npx wrangler login
npx wrangler d1 create team-wheel
```

Copy the returned database UUID, then:

```sh
export CLOUDFLARE_D1_DATABASE_ID='YOUR_DATABASE_UUID'
npm run deploy
npx wrangler secret put TEAM_PASSWORD --config dist/server/wrangler.cloudflare.json
```

The last command prompts privately for a strong shared passphrase. The app refuses access until this secret is set. Share the resulting `https://team-wheel.<your-subdomain>.workers.dev` address and passphrase with the team. The browser's sign-in prompt uses username **team**. No individual accounts or email service are required.

`npm run deploy` builds, applies pending remote D1 migrations, and publishes the Worker. Subsequent deployments use the same command and retain the database and existing secret. Set `CLOUDFLARE_WORKER_NAME` if the default Worker name `team-wheel` is already used. Keep a record of your database UUID; it is an identifier, not a password. You can put it in your shell profile or CI configuration. For CI, use Cloudflare's `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables as well.

To validate the deployment artifact without provisioning or publishing:

```sh
CLOUDFLARE_D1_DATABASE_ID='00000000-0000-4000-8000-000000000001' npm run deploy -- --dry-run
```

`npm run db:migrate:remote` applies migrations independently when `CLOUDFLARE_D1_DATABASE_ID` is set. Database exports/backups are available through Cloudflare D1, for example `npx wrangler d1 export team-wheel --remote --output team-wheel-backup.sql`. Keep exports private; they contain team names and history.

### Sites preview

The `.openai/hosting.json` manifest retains the project's Sites identity and `DB` binding. Sites provisions its own D1 database and applies the same migrations. Its preview uses platform access controls with `ACCESS_MODE=sites`; keep this value in Sites runtime settings. Independent Cloudflare deployments explicitly clear that mode and use `TEAM_PASSWORD` instead. Hosting deployments have separate databases; a Sites preview does not automatically transfer its data to an independently deployed Worker.

## Delete a member

Open **Team**, then choose **Manage → Delete** beside a teammate, then confirm **Delete member**. **Cancel deletion** leaves them unchanged. Deleted members leave the roster and future spins; their past picks, totals, and most-picked statistics remain in history.

After deletion, choose **Undo deletion** in the notice to restore the same member, including their profile, pick count, and previous paused/active state. The notice stays until dismissed or another change is saved. Deleting a member frees roster capacity. Pausing remains available for temporarily excluding a teammate.

## Colors and profile photos

Open **Team**, then choose **Manage → Edit** beside a teammate to change their name, choose a preset or custom color, and upload a profile photo. The team saves a different automatic color for each teammate. Manual choices take precedence. **Use default color** restores the teammate’s saved default. **Remove** clears the photo and brings back initials.

Photos accept JPG, PNG, and WebP files up to 10 MB. The browser center-crops and resizes each photo to 128×128 before saving it (maximum 48 KB). The database stores only this compact version. Photos are served through the authenticated app with versioned, private cache headers; roster refreshes contain photo URLs rather than image payloads. No additional storage service is required. Labels adapt to custom colors for contrast.

The roster, wheel, winner, and pick history show the current profile photo. Historical names and the colors used for past spins remain recorded in saved selections.

## Drawers and spinning

**Team** opens roster management from the left. **History** opens saved picks from the right, including Undo and Show older picks. Close either drawer with its close button, Escape, or the backdrop. Keyboard focus returns to the opener on close. Empty or fully paused wheels include an action to open Team. **How the odds work** opens a popover below the spin action.

The pointer sits at **three o'clock**. Each new spin saves a cryptographically random position inside the selected person's slice, so finishes can be near either edge rather than always at the midpoint. Retries return the same saved landing. The animation varies between 5–7 full turns and 5.2–6.8 seconds, with a slow coast; reduced-motion mode shows the final result immediately. These visual choices do not change the random or balanced selection probabilities. Older saved spins without a landing position retain their original centered finish when replayed.

## Selection rules

- **Random:** every active person has the same probability on every spin. Previous picks have no effect; streaks are possible.
- **Balanced:** `weight = 1 / (1 + person_count - minimum_active_count)`, then normalize the weights into probabilities. Counts of 3, 3, and 4 yield 40%, 40%, and 20%. This reduces repeat selections without guaranteeing a no-repeat order.
- Counters include valid picks from both modes across all saved history. New people start at zero. Paused people retain their history but are excluded from selection and the balancing baseline. Duplicate display names are allowed; people have separate stable IDs.
- The server uses `crypto.getRandomValues()` to draw a 53-bit uniform fraction. The animated wheel represents the odds used for that saved result; the roster shows the odds for the **next** spin.
- The result is saved before the animation. Request IDs make retries idempotent. Database revision triggers and a conditional insert ensure competing spins use current counts; a stale draw is discarded and retried.
- Only the latest valid pick can be undone. Undo retains the record and removes it from counts. Renaming a teammate preserves their name on past picks.
- Other open tabs refresh every 15 seconds while visible and on focus. They share counts and history; they do not replay another person's wheel animation.

## Development checks

```sh
npm run typecheck
npm test
npm run build
```

Tests use Node's test runner and in-memory SQLite with the real SQL migrations. They cover the odds, segment boundaries, saved counts, historical names, concurrent spins, duplicate requests, undo, pagination, and access checks. Local browser/API verification also exercises Cloudflare's D1 runtime.

## Project map

- `app/page.tsx`, `app/globals.css`: single-screen interface and wheel animation.
- `lib/wheel.ts`: selection probabilities, entropy, and shared types.
- `lib/store.ts`: D1 persistence, atomic selection, and history.
- `app/api/[...path]/route.ts`: validated API endpoints.
- `lib/access.ts`, `worker/index.ts`: deployment access and Worker entry point.
- `db/schema.ts`, `drizzle/`: schema and versioned migrations.
- `scripts/database.mjs`, `scripts/deploy-cloudflare.mjs`: local database setup and independent deployment.

All members with access can edit the roster, spin, and undo the latest pick. This version is intentionally one team per deployment.
