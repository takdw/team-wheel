# Team Wheel

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by the request for easy deployment on a free platform with a lightweight database. Cloudflare Workers and D1 provide one hosting target. The Sites starter supplies React, TypeScript, Vinext, and Drizzle; retain its publishing integration while documenting independent Cloudflare deployment.

## Users
Tamrat and teammates choosing who goes next during team meetings. Teammates open the same online app and see the same history.

## Product Purpose
A simple spinning wheel with random and balanced modes, per-person counters, and durable shared pick history. Show selection odds so the team can understand the result.

## Confirmed Scope
- Separate shared rosters and saved history for each team.
- Create a team without an account and join through an eight-character code or invite link.
- Random mode gives each active person equal probability on every spin.
- Balanced mode uses weight 1 / (1 + picks - minimum active picks).
- All valid picks in both modes contribute to counters.
- Rename, pause, and delete members without losing historical names or pick statistics.
- Confirm member deletion inline and offer Undo deletion to restore the profile and counters.
- Per-person custom colors, reset to automatic colors, and optional uploaded profile photos shared across devices.
- Profile photos appear in the roster, wheel, winner, and history. Resize and center-crop photos to 128px before saving them in D1.
- Keep interface copy concise and functional; avoid taglines and decorative slogans.
- Undo the latest valid pick while retaining its audit entry.
- Server-side cryptographic selection, durable results before animation, and concurrency protection.
- Accessible responsive interface with reduced motion.
- Center the wheel on the main screen; keep team management in a modal drawer opening from the left.
- Put the fixed selection pointer at three o'clock. Save a random landing position inside the winner's slice, including near either edge, and preserve it across retries.
- Vary the number of turns and coasting duration while keeping selection odds unchanged.

## Delivery Constraints
Create the standalone project in /Users/tamrat/code/team-wheel, outside all Kadonation repositories. Prefer a free hosting platform with a lightweight hosted database and clear deployment instructions. Keep implementation and ongoing operation simple.

## Assumptions
Team Wheel is a working name. New teams start with an empty roster. Independent Cloudflare hosting uses invite codes and browser sessions. The existing Sites wheel uses Sites access controls. New participants start at zero picks, and everyone who joins a team sees its shared history.
