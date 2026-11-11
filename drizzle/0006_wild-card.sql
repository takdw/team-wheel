CREATE TABLE `__new_picks` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`person_id` text NOT NULL,
	`person_name` text NOT NULL,
	`mode` text NOT NULL,
	`candidates` text NOT NULL,
	`landing_angle` real,
	`effects` text,
	`created_at` text NOT NULL,
	`undone_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "picks_mode_check" CHECK("__new_picks"."mode" IN ('random', 'balanced', 'wildcard', 'volunteer'))
);
--> statement-breakpoint
INSERT INTO `__new_picks`("sequence", "id", "person_id", "person_name", "mode", "candidates", "landing_angle", "created_at", "undone_at") SELECT "sequence", "id", "person_id", "person_name", "mode", "candidates", "landing_angle", "created_at", "undone_at" FROM `picks`;--> statement-breakpoint
DROP TABLE `picks`;--> statement-breakpoint
ALTER TABLE `__new_picks` RENAME TO `picks`;--> statement-breakpoint
CREATE UNIQUE INDEX `picks_id_unique` ON `picks` (`id`);--> statement-breakpoint
CREATE INDEX `picks_person_valid_idx` ON `picks` (`person_id`,`undone_at`);--> statement-breakpoint
ALTER TABLE `people` ADD `absent` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `shields` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `shield_armed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `volunteer_cooldown` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TRIGGER picks_revision_insert AFTER INSERT ON picks BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (1, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
--> statement-breakpoint
CREATE TRIGGER picks_revision_update AFTER UPDATE ON picks BEGIN
  INSERT INTO wheel_state (id, revision) VALUES (1, 1)
  ON CONFLICT(id) DO UPDATE SET revision = revision + 1;
END;
--> statement-breakpoint
-- Apply each turn's effects in the same transaction as its history entry.
CREATE TRIGGER picks_apply_effects AFTER INSERT ON picks
WHEN NEW.effects IS NOT NULL
BEGIN
  UPDATE people SET
    shields = shields + json_extract(effect.value, '$.shieldDelta'),
    shield_armed = CASE WHEN json_extract(effect.value, '$.shieldDelta') < 0 THEN 0 ELSE shield_armed END,
    volunteer_cooldown = json_extract(effect.value, '$.cooldownAfter')
  FROM json_each(NEW.effects) AS effect
  WHERE people.id = json_extract(effect.value, '$.personId');
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
  WHERE people.id = json_extract(effect.value, '$.personId');
END;
