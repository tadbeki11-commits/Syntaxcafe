CREATE TABLE `device_enrollment` (
	`id` integer PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`business_id` text,
	`branch_id` text,
	`device_name` text,
	`enrolled_at` text
);
