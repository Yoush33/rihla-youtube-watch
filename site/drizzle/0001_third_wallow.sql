CREATE TABLE `research` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`trip_id` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`question` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `research_owner_trip_date` ON `research` (`owner`,`trip_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `source_cache` (
	`code` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` text NOT NULL
);
