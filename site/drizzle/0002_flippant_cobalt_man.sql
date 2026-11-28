CREATE TABLE `research_settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`monthly_limit` integer DEFAULT 30 NOT NULL,
	`accepted_at` text NOT NULL
);
