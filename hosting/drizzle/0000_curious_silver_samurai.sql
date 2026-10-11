CREATE TABLE `demo_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_quota` (
	`bucket` text NOT NULL,
	`day` text NOT NULL,
	`used` integer NOT NULL,
	PRIMARY KEY(`bucket`, `day`)
);
