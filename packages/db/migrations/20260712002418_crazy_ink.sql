CREATE TABLE `sync_runs` (
	`sync_run_id` integer PRIMARY KEY NOT NULL,
	`runner` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`papers_seen` integer DEFAULT 0 NOT NULL,
	`papers_new` integer DEFAULT 0 NOT NULL,
	`papers_updated` integer DEFAULT 0 NOT NULL,
	`papers_failed` integer DEFAULT 0 NOT NULL,
	`success` integer DEFAULT false NOT NULL,
	`error_message` text,
	`row_created_at` integer,
	`row_updated_at` integer
);
