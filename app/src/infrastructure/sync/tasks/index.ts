import { pushTasks } from './push-tasks';
import { pullTasks } from './pull-tasks';
import type { SyncTask } from './types';

export const syncTasks: SyncTask[] = [...pushTasks, ...pullTasks];

export * from './types';
