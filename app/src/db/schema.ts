import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username'),
  role: text('role'),
  is_active: integer('is_active'),
  pin: text('pin'),
  passcode: text('passcode'),
  cancel_password: text('cancel_password'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const rolesTable = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name'),
  display_name: text('display_name'),
  description: text('description'),
  is_active: integer('is_active'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const paymentMethodsTable = sqliteTable('paymentMethods', {
  id: text('id').primaryKey(),
  name: text('name'),
  display_name: text('display_name'),
  icon: text('icon'),
  description: text('description'),
  is_active: integer('is_active'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const menuItemsTable = sqliteTable('menuItems', {
  id: text('id').primaryKey(),
  name: text('name'),
  category: text('category'),
  main_category: text('main_category'),
  sub_category: text('sub_category'),
  prep_time_minutes: integer('prep_time_minutes'),
  sku: text('sku'),
  barcode: text('barcode'),
  is_available: integer('is_available'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const categoriesTable = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name'),
  slug: text('slug'),
  icon: text('icon'),
  display_order: integer('display_order'),
  type: text('type'),
  is_active: integer('is_active'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull(),
  created_at: text('created_at'),
  updated_at: text('updated_at')
});

export const mainCategoriesTable = sqliteTable('mainCategories', {
  id: text('id').primaryKey(),
  name: text('name'),
  slug: text('slug'),
  display_order: integer('display_order'),
  is_active: integer('is_active'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull(),
  created_at: text('created_at'),
  updated_at: text('updated_at')
});

export const menuItemCategoriesTable = sqliteTable('menuItemCategories', {
  id: text('id').primaryKey(),
  menu_item_id: text('menu_item_id'),
  category_id: text('category_id'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull(),
  created_at: text('created_at')
});

export const diningTablesTable = sqliteTable('diningTables', {
  id: text('id').primaryKey(),
  table_number: integer('table_number'),
  status: text('status'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const ordersTable = sqliteTable('orders', {
  id: text('id').primaryKey(),
  waiter_id: text('waiter_id'),
  created_by_id: text('created_by_id'),
  organization_id: text('organization_id'),
  status: text('status'),
  synced: integer('synced'),
  created_at: text('created_at'),
  is_printed: integer('is_printed'),
  raw_json: text('raw_json').notNull()
});

export const paymentsTable = sqliteTable('payments', {
  id: text('id').primaryKey(),
  order_id: text('order_id'),
  status: text('status'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const attendanceTable = sqliteTable('attendance', {
  id: text('id').primaryKey(),
  user_id: text('user_id'),
  date: text('date'),
  clock_in_time: text('clock_in_time'),
  clock_out_time: text('clock_out_time'),
  hours_worked: real('hours_worked'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const inventoryItemsTable = sqliteTable('inventoryItems', {
  id: text('id').primaryKey(),
  name: text('name'),
  unit: text('unit'),
  base_unit: text('base_unit'),
  pieces_per_unit: integer('pieces_per_unit'),
  min_quantity: real('min_quantity'),
  min_quantity_mode: text('min_quantity_mode').default('global'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

/** Per-location stock quantities — replaces store_quantity / barista_quantity columns */
export const inventoryStockTable = sqliteTable('inventoryStock', {
  id: text('id').primaryKey(),
  inventory_item_id: text('inventory_item_id').notNull(),
  location_id: text('location_id').notNull(),
  quantity: real('quantity').notNull().default(0),
  min_quantity: real('min_quantity').notNull().default(0),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const stockMovementsTable = sqliteTable('stockMovements', {
  id: text('id').primaryKey(),
  inventory_item_id: text('inventory_item_id'),
  movement_type: text('movement_type'),
  /** @deprecated use location_id */
  location: text('location'),
  location_id: text('location_id'),
  order_id: text('order_id'),
  order_item_id: text('order_item_id'),
  quantity_delta: real('quantity_delta'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const stockTransfersTable = sqliteTable('stockTransfers', {
  id: text('id').primaryKey(),
  /** @deprecated use from_location_id */
  from_location: text('from_location'),
  /** @deprecated use to_location_id */
  to_location: text('to_location'),
  from_location_id: text('from_location_id'),
  to_location_id: text('to_location_id'),
  status: text('status'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const stockTransferItemsTable = sqliteTable('stockTransferItems', {
  id: text('id').primaryKey(),
  transfer_id: text('transfer_id'),
  inventory_item_id: text('inventory_item_id'),
  quantity: real('quantity'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const stockLocationsTable = sqliteTable('stockLocations', {
  id: text('id').primaryKey(),
  name: text('name'),
  slug: text('slug').unique(),
  description: text('description'),
  location_type: text('location_type'),
  is_default: integer('is_default'),
  is_active: integer('is_active'),
  display_order: integer('display_order'),
  linked_main_category_slug: text('linked_main_category_slug'),
  synced: integer('synced'),
  version: integer('version').default(1),
  deleted_at: text('deleted_at'),
  raw_json: text('raw_json').notNull(),
  created_at: text('created_at'),
  updated_at: text('updated_at')
});

export const organizationsTable = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name'),
  contact_name: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  is_active: integer('is_active'),
  synced: integer('synced'),
  version: integer('version').default(1),
  deleted_at: text('deleted_at'),
  raw_json: text('raw_json').notNull(),
  created_at: text('created_at'),
  updated_at: text('updated_at')
});

export const recipesTable = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  menu_item_id: text('menu_item_id'),
  name: text('name'),
  yield_quantity: integer('yield_quantity'),
  deduct_from_location_id: text('deduct_from_location_id'),
  deduct_strategy: text('deduct_strategy'),
  is_active: integer('is_active'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull(),
  created_at: text('created_at'),
  updated_at: text('updated_at')
});

export const recipeIngredientsTable = sqliteTable('recipeIngredients', {
  id: text('id').primaryKey(),
  recipe_id: text('recipe_id'),
  inventory_item_id: text('inventory_item_id'),
  quantity: integer('quantity'),
  waste_factor: text('waste_factor'),
  is_optional: integer('is_optional'),
  notes: text('notes'),
  display_order: integer('display_order'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull()
});

export const expensesTable = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  title: text('title'),
  category: text('category'),
  payment_method: text('payment_method'),
  paid_to: text('paid_to'),
  amount: real('amount'),
  total: real('total'),
  user_id: text('user_id'),
  synced: integer('synced'),
  raw_json: text('raw_json').notNull(),
  created_at: text('created_at'),
  updated_at: text('updated_at')
});

export const systemSettingsTable = sqliteTable('systemSettings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: text('updated_at')
});

export const localDbTables = {
  users: usersTable,
  roles: rolesTable,
  paymentMethods: paymentMethodsTable,
  menuItems: menuItemsTable,
  categories: categoriesTable,
  mainCategories: mainCategoriesTable,
  menuItemCategories: menuItemCategoriesTable,
  diningTables: diningTablesTable,
  orders: ordersTable,
  payments: paymentsTable,
  attendance: attendanceTable,
  inventoryItems: inventoryItemsTable,
  inventoryStock: inventoryStockTable,
  stockMovements: stockMovementsTable,
  stockTransfers: stockTransfersTable,
  stockTransferItems: stockTransferItemsTable,
  stockLocations: stockLocationsTable,
  recipes: recipesTable,
  recipeIngredients: recipeIngredientsTable,
  systemSettings: systemSettingsTable,
  organizations: organizationsTable,
  expenses: expensesTable,
};

