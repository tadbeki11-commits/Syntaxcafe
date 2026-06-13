-- Migration: Convert integer IDs to UUIDs
-- This script converts all integer primary keys and foreign keys to UUIDs
-- Run this before running drizzle-kit push

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to convert integer to UUID
CREATE OR REPLACE FUNCTION int_to_uuid(int_val INTEGER) RETURNS UUID AS $$
BEGIN
    -- Generate a UUID based on the integer value to maintain consistency
    -- This uses a namespace UUID and the integer as the name
    RETURN uuid_generate_v5(uuid_ns_dns(), int_val::text);
END;
$$ LANGUAGE plpgsql;

-- Convert each table's id column from integer to UUID
-- We need to do this in a specific order to handle foreign key constraints

-- Step 1: Add temporary UUID columns to all tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE main_categories ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE menu_item_categories ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE order_status_logs ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE org_credit_payments ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE org_credit_transactions ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE inventory_stock ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE stock_transfer_items ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE sync_metadata ADD COLUMN IF NOT EXISTS id_new UUID;

-- Step 2: Populate the new UUID columns
UPDATE users SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE roles SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE payment_methods SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE categories SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE main_categories SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE menu_items SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE menu_item_categories SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE dining_tables SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE orders SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE order_items SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE order_status_logs SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE payments SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE organizations SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE org_credit_payments SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE org_credit_transactions SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE inventory_items SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE inventory_stock SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE stock_locations SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE stock_movements SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE stock_transfers SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE stock_transfer_items SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE recipes SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE recipe_ingredients SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE system_settings SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE sync_events SET id_new = int_to_uuid(id) WHERE id_new IS NULL;
UPDATE sync_metadata SET id_new = int_to_uuid(id) WHERE id_new IS NULL;

-- Step 3: Drop foreign key constraints
-- Note: You may need to adjust constraint names based on your actual database

-- Drop constraints for menu_item_categories
ALTER TABLE menu_item_categories DROP CONSTRAINT IF EXISTS menu_item_categories_menu_item_id_fkey;
ALTER TABLE menu_item_categories DROP CONSTRAINT IF EXISTS menu_item_categories_category_id_fkey;

-- Drop constraints for order_items
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey;

-- Drop constraints for order_status_logs
ALTER TABLE order_status_logs DROP CONSTRAINT IF EXISTS order_status_logs_order_id_fkey;

-- Drop constraints for payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_order_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_id_fkey;

-- Drop constraints for org_credit_payments
ALTER TABLE org_credit_payments DROP CONSTRAINT IF EXISTS org_credit_payments_organization_id_fkey;

-- Drop constraints for org_credit_transactions
ALTER TABLE org_credit_transactions DROP CONSTRAINT IF EXISTS org_credit_transactions_organization_id_fkey;

-- Drop constraints for inventory_stock
ALTER TABLE inventory_stock DROP CONSTRAINT IF EXISTS inventory_stock_inventory_item_id_fkey;
ALTER TABLE inventory_stock DROP CONSTRAINT IF EXISTS inventory_stock_location_id_fkey;

-- Drop constraints for stock_movements
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_inventory_item_id_fkey;
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_location_id_fkey;

-- Drop constraints for stock_transfers
ALTER TABLE stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_from_location_id_fkey;
ALTER TABLE stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_to_location_id_fkey;

-- Drop constraints for stock_transfer_items
ALTER TABLE stock_transfer_items DROP CONSTRAINT IF EXISTS stock_transfer_items_transfer_id_fkey;
ALTER TABLE stock_transfer_items DROP CONSTRAINT IF EXISTS stock_transfer_items_inventory_item_id_fkey;

-- Drop constraints for recipes
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_menu_item_id_fkey;

-- Drop constraints for recipe_ingredients
ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_recipe_id_fkey;
ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_inventory_item_id_fkey;

-- Drop constraints for users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_id_fkey;

-- Step 4: Convert foreign key columns to UUID
-- menu_item_categories
ALTER TABLE menu_item_categories ADD COLUMN IF NOT EXISTS menu_item_id_new UUID;
ALTER TABLE menu_item_categories ADD COLUMN IF NOT EXISTS category_id_new UUID;
UPDATE menu_item_categories SET menu_item_id_new = (SELECT id_new FROM menu_items WHERE menu_items.id = menu_item_categories.menu_item_id);
UPDATE menu_item_categories SET category_id_new = (SELECT id_new FROM categories WHERE categories.id = menu_item_categories.category_id);

-- order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_id_new UUID;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS menu_item_id_new UUID;
UPDATE order_items SET order_id_new = (SELECT id_new FROM orders WHERE orders.id = order_items.order_id);
UPDATE order_items SET menu_item_id_new = (SELECT id_new FROM menu_items WHERE menu_items.id = order_items.menu_item_id);

-- order_status_logs
ALTER TABLE order_status_logs ADD COLUMN IF NOT EXISTS order_id_new UUID;
UPDATE order_status_logs SET order_id_new = (SELECT id_new FROM orders WHERE orders.id = order_status_logs.order_id);

-- payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id_new UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method_id_new UUID;
UPDATE payments SET order_id_new = (SELECT id_new FROM orders WHERE orders.id = payments.order_id);
UPDATE payments SET payment_method_id_new = (SELECT id_new FROM payment_methods WHERE payment_methods.id = payments.payment_method_id);

-- org_credit_payments
ALTER TABLE org_credit_payments ADD COLUMN IF NOT EXISTS organization_id_new UUID;
UPDATE org_credit_payments SET organization_id_new = (SELECT id_new FROM organizations WHERE organizations.id = org_credit_payments.organization_id);

-- org_credit_transactions
ALTER TABLE org_credit_transactions ADD COLUMN IF NOT EXISTS organization_id_new UUID;
UPDATE org_credit_transactions SET organization_id_new = (SELECT id_new FROM organizations WHERE organizations.id = org_credit_transactions.organization_id);

-- inventory_stock
ALTER TABLE inventory_stock ADD COLUMN IF NOT EXISTS inventory_item_id_new UUID;
ALTER TABLE inventory_stock ADD COLUMN IF NOT EXISTS location_id_new UUID;
UPDATE inventory_stock SET inventory_item_id_new = (SELECT id_new FROM inventory_items WHERE inventory_items.id = inventory_stock.inventory_item_id);
UPDATE inventory_stock SET location_id_new = (SELECT id_new FROM stock_locations WHERE stock_locations.id = inventory_stock.location_id);

-- stock_movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS inventory_item_id_new UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS location_id_new UUID;
UPDATE stock_movements SET inventory_item_id_new = (SELECT id_new FROM inventory_items WHERE inventory_items.id = stock_movements.inventory_item_id);
UPDATE stock_movements SET location_id_new = (SELECT id_new FROM stock_locations WHERE stock_locations.id = stock_movements.location_id);

-- stock_transfers
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS from_location_id_new UUID;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS to_location_id_new UUID;
UPDATE stock_transfers SET from_location_id_new = (SELECT id_new FROM stock_locations WHERE stock_locations.id = stock_transfers.from_location_id);
UPDATE stock_transfers SET to_location_id_new = (SELECT id_new FROM stock_locations WHERE stock_locations.id = stock_transfers.to_location_id);

-- stock_transfer_items
ALTER TABLE stock_transfer_items ADD COLUMN IF NOT EXISTS transfer_id_new UUID;
ALTER TABLE stock_transfer_items ADD COLUMN IF NOT EXISTS inventory_item_id_new UUID;
UPDATE stock_transfer_items SET transfer_id_new = (SELECT id_new FROM stock_transfers WHERE stock_transfers.id = stock_transfer_items.transfer_id);
UPDATE stock_transfer_items SET inventory_item_id_new = (SELECT id_new FROM inventory_items WHERE inventory_items.id = stock_transfer_items.inventory_item_id);

-- recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS menu_item_id_new UUID;
UPDATE recipes SET menu_item_id_new = (SELECT id_new FROM menu_items WHERE menu_items.id = recipes.menu_item_id);

-- recipe_ingredients
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS recipe_id_new UUID;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS inventory_item_id_new UUID;
UPDATE recipe_ingredients SET recipe_id_new = (SELECT id_new FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id);
UPDATE recipe_ingredients SET inventory_item_id_new = (SELECT id_new FROM inventory_items WHERE inventory_items.id = recipe_ingredients.inventory_item_id);

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id_new UUID;
UPDATE users SET role_id_new = (SELECT id_new FROM roles WHERE roles.id = users.role_id);

-- Step 5: Drop old columns and rename new columns
-- For each table, drop the old id column and rename the new one

-- Drop old foreign key columns
ALTER TABLE menu_item_categories DROP COLUMN menu_item_id;
ALTER TABLE menu_item_categories DROP COLUMN category_id;
ALTER TABLE menu_item_categories RENAME COLUMN menu_item_id_new TO menu_item_id;
ALTER TABLE menu_item_categories RENAME COLUMN category_id_new TO category_id;

ALTER TABLE order_items DROP COLUMN order_id;
ALTER TABLE order_items DROP COLUMN menu_item_id;
ALTER TABLE order_items RENAME COLUMN order_id_new TO order_id;
ALTER TABLE order_items RENAME COLUMN menu_item_id_new TO menu_item_id;

ALTER TABLE order_status_logs DROP COLUMN order_id;
ALTER TABLE order_status_logs RENAME COLUMN order_id_new TO order_id;

ALTER TABLE payments DROP COLUMN order_id;
ALTER TABLE payments DROP COLUMN payment_method_id;
ALTER TABLE payments RENAME COLUMN order_id_new TO order_id;
ALTER TABLE payments RENAME COLUMN payment_method_id_new TO payment_method_id;

ALTER TABLE org_credit_payments DROP COLUMN organization_id;
ALTER TABLE org_credit_payments RENAME COLUMN organization_id_new TO organization_id;

ALTER TABLE org_credit_transactions DROP COLUMN organization_id;
ALTER TABLE org_credit_transactions RENAME COLUMN organization_id_new TO organization_id;

ALTER TABLE inventory_stock DROP COLUMN inventory_item_id;
ALTER TABLE inventory_stock DROP COLUMN location_id;
ALTER TABLE inventory_stock RENAME COLUMN inventory_item_id_new TO inventory_item_id;
ALTER TABLE inventory_stock RENAME COLUMN location_id_new TO location_id;

ALTER TABLE stock_movements DROP COLUMN inventory_item_id;
ALTER TABLE stock_movements DROP COLUMN location_id;
ALTER TABLE stock_movements RENAME COLUMN inventory_item_id_new TO inventory_item_id;
ALTER TABLE stock_movements RENAME COLUMN location_id_new TO location_id;

ALTER TABLE stock_transfers DROP COLUMN from_location_id;
ALTER TABLE stock_transfers DROP COLUMN to_location_id;
ALTER TABLE stock_transfers RENAME COLUMN from_location_id_new TO from_location_id;
ALTER TABLE stock_transfers RENAME COLUMN to_location_id_new TO to_location_id;

ALTER TABLE stock_transfer_items DROP COLUMN transfer_id;
ALTER TABLE stock_transfer_items DROP COLUMN inventory_item_id;
ALTER TABLE stock_transfer_items RENAME COLUMN transfer_id_new TO transfer_id;
ALTER TABLE stock_transfer_items RENAME COLUMN inventory_item_id_new TO inventory_item_id;

ALTER TABLE recipes DROP COLUMN menu_item_id;
ALTER TABLE recipes RENAME COLUMN menu_item_id_new TO menu_item_id;

ALTER TABLE recipe_ingredients DROP COLUMN recipe_id;
ALTER TABLE recipe_ingredients DROP COLUMN inventory_item_id;
ALTER TABLE recipe_ingredients RENAME COLUMN recipe_id_new TO recipe_id;
ALTER TABLE recipe_ingredients RENAME COLUMN inventory_item_id_new TO inventory_item_id;

ALTER TABLE users DROP COLUMN role_id;
ALTER TABLE users RENAME COLUMN role_id_new TO role_id;

-- Drop old id columns and rename new ones for all tables
ALTER TABLE users DROP COLUMN id;
ALTER TABLE users RENAME COLUMN id_new TO id;

ALTER TABLE roles DROP COLUMN id;
ALTER TABLE roles RENAME COLUMN id_new TO id;

ALTER TABLE payment_methods DROP COLUMN id;
ALTER TABLE payment_methods RENAME COLUMN id_new TO id;

ALTER TABLE categories DROP COLUMN id;
ALTER TABLE categories RENAME COLUMN id_new TO id;

ALTER TABLE main_categories DROP COLUMN id;
ALTER TABLE main_categories RENAME COLUMN id_new TO id;

ALTER TABLE menu_items DROP COLUMN id;
ALTER TABLE menu_items RENAME COLUMN id_new TO id;

ALTER TABLE menu_item_categories DROP COLUMN id;
ALTER TABLE menu_item_categories RENAME COLUMN id_new TO id;

ALTER TABLE dining_tables DROP COLUMN id;
ALTER TABLE dining_tables RENAME COLUMN id_new TO id;

ALTER TABLE orders DROP COLUMN id;
ALTER TABLE orders RENAME COLUMN id_new TO id;

ALTER TABLE order_items DROP COLUMN id;
ALTER TABLE order_items RENAME COLUMN id_new TO id;

ALTER TABLE order_status_logs DROP COLUMN id;
ALTER TABLE order_status_logs RENAME COLUMN id_new TO id;

ALTER TABLE payments DROP COLUMN id;
ALTER TABLE payments RENAME COLUMN id_new TO id;

ALTER TABLE organizations DROP COLUMN id;
ALTER TABLE organizations RENAME COLUMN id_new TO id;

ALTER TABLE org_credit_payments DROP COLUMN id;
ALTER TABLE org_credit_payments RENAME COLUMN id_new TO id;

ALTER TABLE org_credit_transactions DROP COLUMN id;
ALTER TABLE org_credit_transactions RENAME COLUMN id_new TO id;

ALTER TABLE inventory_items DROP COLUMN id;
ALTER TABLE inventory_items RENAME COLUMN id_new TO id;

ALTER TABLE inventory_stock DROP COLUMN id;
ALTER TABLE inventory_stock RENAME COLUMN id_new TO id;

ALTER TABLE stock_locations DROP COLUMN id;
ALTER TABLE stock_locations RENAME COLUMN id_new TO id;

ALTER TABLE stock_movements DROP COLUMN id;
ALTER TABLE stock_movements RENAME COLUMN id_new TO id;

ALTER TABLE stock_transfers DROP COLUMN id;
ALTER TABLE stock_transfers RENAME COLUMN id_new TO id;

ALTER TABLE stock_transfer_items DROP COLUMN id;
ALTER TABLE stock_transfer_items RENAME COLUMN id_new TO id;

ALTER TABLE recipes DROP COLUMN id;
ALTER TABLE recipes RENAME COLUMN id_new TO id;

ALTER TABLE recipe_ingredients DROP COLUMN id;
ALTER TABLE recipe_ingredients RENAME COLUMN id_new TO id;

ALTER TABLE system_settings DROP COLUMN id;
ALTER TABLE system_settings RENAME COLUMN id_new TO id;

ALTER TABLE sync_events DROP COLUMN id;
ALTER TABLE sync_events RENAME COLUMN id_new TO id;

ALTER TABLE sync_metadata DROP COLUMN id;
ALTER TABLE sync_metadata RENAME COLUMN id_new TO id;

-- Step 6: Recreate foreign key constraints with UUID types
-- menu_item_categories
ALTER TABLE menu_item_categories ADD CONSTRAINT menu_item_categories_menu_item_id_fkey 
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;
ALTER TABLE menu_item_categories ADD CONSTRAINT menu_item_categories_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

-- order_items
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE order_items ADD CONSTRAINT order_items_menu_item_id_fkey 
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;

-- order_status_logs
ALTER TABLE order_status_logs ADD CONSTRAINT order_status_logs_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- payments
ALTER TABLE payments ADD CONSTRAINT payments_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_id_fkey 
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE;

-- org_credit_payments
ALTER TABLE org_credit_payments ADD CONSTRAINT org_credit_payments_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- org_credit_transactions
ALTER TABLE org_credit_transactions ADD CONSTRAINT org_credit_transactions_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- inventory_stock
ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_inventory_item_id_fkey 
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;
ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_location_id_fkey 
    FOREIGN KEY (location_id) REFERENCES stock_locations(id) ON DELETE CASCADE;

-- stock_movements
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_inventory_item_id_fkey 
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_location_id_fkey 
    FOREIGN KEY (location_id) REFERENCES stock_locations(id) ON DELETE CASCADE;

-- stock_transfers
ALTER TABLE stock_transfers ADD CONSTRAINT stock_transfers_from_location_id_fkey 
    FOREIGN KEY (from_location_id) REFERENCES stock_locations(id) ON DELETE CASCADE;
ALTER TABLE stock_transfers ADD CONSTRAINT stock_transfers_to_location_id_fkey 
    FOREIGN KEY (to_location_id) REFERENCES stock_locations(id) ON DELETE CASCADE;

-- stock_transfer_items
ALTER TABLE stock_transfer_items ADD CONSTRAINT stock_transfer_items_transfer_id_fkey 
    FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE;
ALTER TABLE stock_transfer_items ADD CONSTRAINT stock_transfer_items_inventory_item_id_fkey 
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;

-- recipes
ALTER TABLE recipes ADD CONSTRAINT recipes_menu_item_id_fkey 
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;

-- recipe_ingredients
ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_recipe_id_fkey 
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE;
ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_inventory_item_id_fkey 
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;

-- users
ALTER TABLE users ADD CONSTRAINT users_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

-- Step 7: Drop the entity_local_id column from sync_events
ALTER TABLE sync_events DROP COLUMN IF EXISTS entity_local_id;

-- Step 8: Clean up the helper function
DROP FUNCTION IF EXISTS int_to_uuid(INTEGER);
