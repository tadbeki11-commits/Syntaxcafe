import { useMemo } from 'react';
import { NormalizedInventoryItem, StockLocation } from '../types';

export interface LocationStats {
  inStock: number;
  lowStock: number;
  totalItems: number;
}

export const useLocationStats = (
  stockLocations: StockLocation[],
  normalizedItems: NormalizedInventoryItem[]
) => {
  const locationStats = useMemo(() => {
    const stats: Record<number, LocationStats> = {};
    
    stockLocations.forEach(loc => {
      let inStock = 0;
      let lowStock = 0;
      let totalItems = 0;
      
      normalizedItems.forEach(item => {
        const stockByLocation = item.stock_by_location || [];
        const entry = stockByLocation.find((s: any) => s.location_id === loc.id);
        const qty = entry ? Number(entry.quantity) : 0;
        
        const isTracked = entry !== undefined || loc.is_default;
        if (isTracked) {
          totalItems++;
        }
        
        if (qty > 0) {
          inStock++;
        }
        
        const minMode = (item as any).min_quantity_mode || 'global';
        if (minMode === 'per_location') {
          const locMin = entry?.min_quantity != null ? Number(entry.min_quantity) : 0;
          if (locMin > 0 && qty < locMin) {
            lowStock++;
          }
        } else {
          const globalMin = Number(item.min_quantity || 0);
          if (loc.is_default && globalMin > 0 && qty < globalMin) {
            lowStock++;
          }
        }
      });
      
      stats[loc.id] = { inStock, lowStock, totalItems };
    });
    
    return stats;
  }, [stockLocations, normalizedItems]);

  return locationStats;
};
