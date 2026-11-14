CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`details` text NOT NULL,
	`files` text NOT NULL,
	`status` text DEFAULT 'Nuova' NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`team` text NOT NULL,
	`key` text NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_limits (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
