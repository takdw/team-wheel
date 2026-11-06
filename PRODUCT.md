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
- One shared team roster and saved history.
- Random mode gives each active person equal probability on every spin.
- Balanced mode uses weight 1 / (1 + picks - minimum active picks).
- All valid picks in both modes contribute to counters.
- Rename and deactivate people without losing historical names.
- Per-person custom colors, reset to automatic colors, and optional uploaded profile photos shared across devices.
- Profile photos appear in the roster, wheel, winner, and history. Resize and center-crop photos to 128px before saving them in D1.
- Keep interface copy concise and functional; avoid taglines and decorative slogans.
- Undo the latest valid pick while retaining its audit entry.
- Server-side cryptographic selection, durable results before animation, and concurrency protection.
- Accessible responsive interface with reduced motion.

## Delivery Constraints
Create the standalone project in /Users/tamrat/code/team-wheel, outside all Kadonation repositories. Prefer a free hosting platform with a lightweight hosted database and clear deployment instructions. Keep implementation and ongoing operation simple.

## Assumptions
Team Wheel is a working name. The initial roster is empty; teammates add their own names. The hosted preview uses Sites access controls. Independent Cloudflare hosting uses a shared password. New participants start at zero picks. History is shared per deployment rather than belonging to individual signed-in users.
