CREATE TABLE `team_access_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `team_access_limits_expiry_idx` ON `team_access_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `team_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`team_id` integer NOT NULL,
	`owner` integer DEFAULT false NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `team_sessions_expiry_idx` ON `team_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`join_code` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_join_code_unique` ON `teams` (`join_code`);--> statement-breakpoint
DROP INDEX `picks_id_unique`;--> statement-breakpoint
ALTER TABLE `picks` ADD `team_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `picks_team_request_idx` ON `picks` (`team_id`,`id`);--> statement-breakpoint
CREATE INDEX `picks_team_history_idx` ON `picks` (`team_id`,`sequence`);--> statement-breakpoint
ALTER TABLE `people` ADD `team_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `people_team_idx` ON `people` (`team_id`);
--> statement-breakpoint
-- Legacy deployments keep their existing wheel and revision under team 1.
INSERT INTO teams (id, name) VALUES (1, 'Team Wheel');
--> statement-breakpoint
DROP TRIGGER people_revision_insert;
--> statement-breakpoint
DROP TRIGGER people_revision_update;
--> statement-breakpoint
DROP TRIGGER picks_revision_insert;
--> statement-breakpoint
DROP TRIGGER picks_revision_update;
--> statement-breakpoint
DROP TRIGGER picks_apply_effects;
--> statement-breakpoint
DROP TRIGGER picks_undo_effects;
--> statement-breakpoint
CREATE TRIGGER people_revision_insert AFTER INSERT ON people BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (NEW.team_id, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
--> statement-breakpoint
CREATE TRIGGER people_revision_update AFTER UPDATE ON people BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (NEW.team_id, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
--> statement-breakpoint
CREATE TRIGGER picks_revision_insert AFTER INSERT ON picks BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (NEW.team_id, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
--> statement-breakpoint
CREATE TRIGGER picks_revision_update AFTER UPDATE ON picks BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (NEW.team_id, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
--> statement-breakpoint
CREATE TRIGGER picks_apply_effects AFTER INSERT ON picks
WHEN NEW.effects IS NOT NULL
BEGIN
  UPDATE people SET
    shields = shields + json_extract(effect.value, '$.shieldDelta'),
    shield_armed = CASE WHEN json_extract(effect.value, '$.shieldDelta') < 0 THEN 0 ELSE shield_armed END,
    volunteer_cooldown = json_extract(effect.value, '$.cooldownAfter')
  FROM json_each(NEW.effects) AS effect
  WHERE people.team_id = NEW.team_id AND people.id = json_extract(effect.value, '$.personId');
END;
--> statement-breakpoint
CREATE TRIGGER picks_undo_effects AFTER UPDATE OF undone_at ON picks
WHEN OLD.undone_at IS NULL AND NEW.undone_at IS NOT NULL AND NEW.effects IS NOT NULL
BEGIN
  UPDATE people SET
    shields = shields - json_extract(effect.value, '$.shieldDelta'),
    shield_armed = CASE
      WHEN json_extract(effect.value, '$.shieldDelta') < 0 THEN 1
      WHEN shields - json_extract(effect.value, '$.shieldDelta') = 0 THEN 0
      ELSE shield_armed
    END,
    volunteer_cooldown = json_extract(effect.value, '$.cooldownBefore')
  FROM json_each(NEW.effects) AS effect
  WHERE people.team_id = NEW.team_id AND people.id = json_extract(effect.value, '$.personId');
END;
