export interface Table {
  id: number;
  number: number;
  capacity: number;
  status: 'available' | 'occupied';
  waiter_name?: string | null;
}

export interface TableFormData {
  number: string;
  capacity: string;
}
