export interface AggregatedItemRow {
  unit: string;
  item: string;
  qtySold: number;
  revenue: number;
}

export interface ItemSalesCounts {
  foodQty: number;
  softQty: number;
}
