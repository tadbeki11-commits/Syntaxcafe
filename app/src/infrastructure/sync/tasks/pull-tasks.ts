import api from '@/application';
import { api as apiClient } from '@/infrastructure/api/http-client';
import { localDbTables } from '@/db/localDb';
import { readRows, upsertRow, deleteById } from '@/infrastructure/database/local-db-query';
import { usersAdapter } from '@/infrastructure/adapters/users.adapter';
import { persistServerOrders } from '@/infrastructure/adapters/orders.adapter';
import { SyncTask } from './types';

const usersPullTask: SyncTask = {
  name: 'users_pull',
  async pull() {
    try {
      await usersAdapter.getAll(undefined);
    } catch (error) {
      console.error('[sync] Failed to refresh users', error);
    }
  },
};

const rolesPullTask: SyncTask = {
  name: 'roles_pull',
  async pull() {
    try {
      await api.settings.getRoles();
    } catch (error) {
      console.error('[sync] Failed to refresh roles', error);
    }
  },
};

const paymentMethodsPullTask: SyncTask = {
  name: 'payment_methods_pull',
  async pull() {
    try {
      await api.settings.getPaymentMethods();
    } catch (error) {
      console.error('[sync] Failed to refresh payment methods', error);
    }
  },
};

const organizationsPullTask: SyncTask = {
  name: 'organizations_pull',
  async pull() {
    try {
      await api.organizations.getAll(true);
    } catch (error) {
      console.error('[sync] Failed to refresh organizations', error);
    }
  },
};

const menuPullTask: SyncTask = {
  name: 'menu_items_pull',
  async pull() {
    try {
      // Fetch all menu items in batch using the dedicated cafe menu endpoint
      await api.menu.getCafeMenu(true);
    } catch (error) {
      console.error('[sync] Failed to refresh menu items', error);
    }
  },
};

const tablesPullTask: SyncTask = {
  name: 'tables_pull',
  async pull() {
    try {
      const resp = await apiClient.get('/tables');
      const tablesList =
        resp.data?.data?.tables ?? resp.data?.tables ?? [];
      const remoteTables: any[] = Array.isArray(tablesList) ? tablesList : [];

      const localTables = await readRows(localDbTables.diningTables);
      const remoteIds = new Set(remoteTables.map((t: any) => String(t.id)));

      // Upsert each backend table into local DB
      for (const remote of remoteTables) {
        const local = localTables.find(
          (l: any) => String(l.id) === String(remote.id),
        );
        if (local) {
          // Don't overwrite a locally-modified unsynced row
          if (Number(local.synced) === 0) continue;
          await upsertRow(localDbTables.diningTables, {
            ...local,
            table_number: remote.table_number ?? remote.number ?? local.table_number,
            status: remote.status ?? local.status,
            synced: 1,
          });
        } else {
          await upsertRow(localDbTables.diningTables, {
            id: remote.id,
            table_number: remote.table_number ?? remote.number ?? 0,
            status: remote.status ?? 'available',
            synced: 1,
          });
        }
      }

      // Remove local synced rows that no longer exist on the backend
      for (const local of localTables) {
        if (Number(local.synced) === 1 && !remoteIds.has(String(local.id))) {
          await deleteById(localDbTables.diningTables, String(local.id));
        }
      }
    } catch (error) {
      console.error('[sync] Failed to refresh tables', error);
    }
  },
};

// Inventory is backend-only (no local mirror) — nothing to pull/refresh here.

const recipesPullTask: SyncTask = {
  name: 'recipes_pull',
  async pull() {
    try {
      await api.recipes.getAll();
    } catch (error) {
      console.error('[sync] Failed to refresh recipes', error);
    }
  },
};

const ordersPullTask: SyncTask = {
  name: 'orders_pull',
  async pull() {
    try {
      // Pull today's orders from the backend into the local DB. The cashier
      // list reads exclusively from local, so this is how orders created on
      // other devices (e.g. the web waiter app) become visible. The realtime
      // socket handles the instant path; this reconciles anything it missed
      // (offline gaps, reconnects, app restart).
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const resp = await apiClient.get('/orders', {
        params: { date_from: startOfDay.toISOString() },
      });
      const remoteOrders =
        resp.data?.data?.orders ?? resp.data?.orders ?? [];

      await persistServerOrders(remoteOrders);
    } catch (error) {
      console.error('[sync] Failed to refresh orders', error);
    }
  },
};

const settingsPullTask: SyncTask = {
  name: 'settings_pull',
  async pull() {
    try {
      await api.settings.getCurrentUserSettings();
    } catch (error) {
      console.error('[sync] Failed to refresh settings (cancel password)', error);
    }
  },
};

export const pullTasks: SyncTask[] = [
  usersPullTask,
  rolesPullTask,
  settingsPullTask,
  paymentMethodsPullTask,
  organizationsPullTask,
  menuPullTask,
  tablesPullTask,
  recipesPullTask,
  ordersPullTask,
];
