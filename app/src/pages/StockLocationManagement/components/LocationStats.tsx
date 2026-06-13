import React from 'react';
import { MapPin, Warehouse } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StockLocation } from '../types';

interface LocationStatsProps {
  locations: StockLocation[];
}

export const LocationStats: React.FC<LocationStatsProps> = ({ locations }) => {
  const activeCount = locations.filter((location) => location.is_active).length;
  const defaultLocation = locations.find((location) => location.is_default);
  const prepStations = locations.filter(
    (location) => location.location_type === 'prep_station' && location.is_active,
  ).length;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Locations</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-info/10 p-2 text-info">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Default Location</p>
              <p className="text-sm font-bold truncate">{defaultLocation?.name || 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2 text-warning">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prep Stations</p>
              <p className="text-2xl font-bold">{prepStations}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationStats;
