ALTER TABLE `teams` ADD `public_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `teams_public_id_unique` ON `teams` (`public_id`);
--> statement-breakpoint
-- Assign UUIDv4 addresses to existing teams while keeping their IDs and sessions.
UPDATE teams SET public_id = lower(
  hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
  substr(hex(randomblob(2)), 2) || '-' ||
  substr('89ab', 1 + (random() & 3), 1) || substr(hex(randomblob(2)), 2) ||
  '-' || hex(randomblob(6))
) WHERE id <> 1;
