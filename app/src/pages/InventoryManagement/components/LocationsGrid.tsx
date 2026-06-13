import React from 'react';
import LocationCard from './LocationCard';
import { StockLocation } from '../types';

interface LocationsGridProps {
  stockLocations: StockLocation[];
  locationStats: Record<number, { inStock: number; lowStock: number; totalItems: number }>;
  onLocationClick: (locationId: number) => void;
}

export const LocationsGrid: React.FC<LocationsGridProps> = ({
  stockLocations,
  locationStats,
  onLocationClick
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stockLocations.map(loc => {
        const stats = locationStats[loc.id] || { inStock: 0, lowStock: 0, totalItems: 0 };
        return (
          <LocationCard
            key={loc.id}
            location={loc}
            stats={stats}
            onClick={() => onLocationClick(loc.id)}
          />
        );
      })}
    </div>
  );
};

export default LocationsGrid;
