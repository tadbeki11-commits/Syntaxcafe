import { OrgFormState, ServiceRow } from './types';

export const EMPTY_FORM: OrgFormState = {
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

export const EMPTY_SERVICE: ServiceRow = {
  description: '',
  cost: '',
};

export const DEFAULT_HISTORY_LIMIT = 20;
