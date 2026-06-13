CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`date` text,
	`clock_in_time` text,
	`clock_out_time` text,
	`hours_worked` real,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`slug` text,
	`icon` text,
	`display_order` integer,
	`type` text,
	`is_active` integer,
	`synced` integer,
	`raw_json` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `diningTables` (
	`id` text PRIMARY KEY NOT NULL,
	`table_number` integer,
	`status` text,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`category` text,
	`payment_method` text,
	`paid_to` text,
	`amount` real,
	`total` real,
	`user_id` text,
	`synced` integer,
	`raw_json` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `inventoryItems` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`unit` text,
	`base_unit` text,
	`pieces_per_unit` integer,
	`min_quantity` real,
	`min_quantity_mode` text DEFAULT 'global',
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventoryStock` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_item_id` text NOT NULL,
	`location_id` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`min_quantity` real DEFAULT 0 NOT NULL,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mainCategories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`slug` text,
	`display_order` integer,
	`is_active` integer,
	`synced` integer,
	`raw_json` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `menuItemCategories` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_item_id` text,
	`category_id` text,
	`synced` integer,
	`raw_json` text NOT NULL,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `menuItems` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`category` text,
	`main_category` text,
	`sub_category` text,
	`prep_time_minutes` integer,
	`sku` text,
	`barcode` text,
	`is_available` integer,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`waiter_id` text,
	`created_by_id` text,
	`organization_id` text,
	`status` text,
	`synced` integer,
	`created_at` text,
	`is_printed` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`contact_name` text,
	`phone` text,
	`email` text,
	`address` text,
	`notes` text,
	`is_active` integer,
	`synced` integer,
	`version` integer DEFAULT 1,
	`deleted_at` text,
	`raw_json` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `paymentMethods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`display_name` text,
	`icon` text,
	`description` text,
	`is_active` integer,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`status` text,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipeIngredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text,
	`inventory_item_id` text,
	`quantity` integer,
	`waste_factor` text,
	`is_optional` integer,
	`notes` text,
	`display_order` integer,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_item_id` text,
	`name` text,
	`yield_quantity` integer,
	`deduct_from_location_id` text,
	`deduct_strategy` text,
	`is_active` integer,
	`synced` integer,
	`raw_json` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`display_name` text,
	`description` text,
	`is_active` integer,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stockLocations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`slug` text,
	`description` text,
	`location_type` text,
	`is_default` integer,
	`is_active` integer,
	`display_order` integer,
	`linked_main_category_slug` text,
	`synced` integer,
	`version` integer DEFAULT 1,
	`deleted_at` text,
	`raw_json` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stockLocations_slug_unique` ON `stockLocations` (`slug`);--> statement-breakpoint
CREATE TABLE `stockMovements` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_item_id` text,
	`movement_type` text,
	`location` text,
	`location_id` text,
	`order_id` text,
	`order_item_id` text,
	`quantity_delta` real,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stockTransferItems` (
	`id` text PRIMARY KEY NOT NULL,
	`transfer_id` text,
	`inventory_item_id` text,
	`quantity` real,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stockTransfers` (
	`id` text PRIMARY KEY NOT NULL,
	`from_location` text,
	`to_location` text,
	`from_location_id` text,
	`to_location_id` text,
	`status` text,
	`synced` integer,
	`raw_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `systemSettings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`role` text,
	`is_active` integer,
	`pin` text,
	`passcode` text,
	`cancel_password` text,
	`synced` integer,
	`raw_json` text NOT NULL
);
