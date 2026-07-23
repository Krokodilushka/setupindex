CREATE TABLE `creators` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`slug` text NOT NULL UNIQUE,
	`document` text NOT NULL,
	`indexable` integer NOT NULL,
	`featured` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webauthn_credentials` (
	`id` text PRIMARY KEY,
	`owner_key` text NOT NULL UNIQUE,
	`public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text NOT NULL,
	`aaguid` text,
	`created_at` text NOT NULL
);
