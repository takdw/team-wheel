CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `picks` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`person_id` text NOT NULL,
	`person_name` text NOT NULL,
	`mode` text NOT NULL,
	`candidates` text NOT NULL,
	`created_at` text NOT NULL,
	`undone_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "picks_mode_check" CHECK("picks"."mode" IN ('random', 'balanced'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `picks_id_unique` ON `picks` (`id`);--> statement-breakpoint
CREATE INDEX `picks_person_valid_idx` ON `picks` (`person_id`,`undone_at`);--> statement-breakpoint
CREATE TABLE `wheel_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
