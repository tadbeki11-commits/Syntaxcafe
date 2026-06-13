import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DateFilterBarProps {
  statsRange: string;
  setStatsRange: (range: string) => void;
  customStatsDate: string;
  setCustomStatsDate: (date: string) => void;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  statsRange,
  setStatsRange,
  customStatsDate,
  setCustomStatsDate
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40 border p-3 rounded-2xl">
      <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
        {['all', 'today', 'yesterday', 'week', 'month', 'custom'].map((rng) => (
          <Button
            key={rng}
            variant={statsRange === rng ? 'secondary' : 'ghost'}
            size="sm"
            className="h-10 text-base uppercase rounded-lg whitespace-nowrap flex-shrink-0"
            onClick={() => setStatsRange(rng)}
          >
            {rng}
          </Button>
        ))}
      </div>

      {statsRange === 'custom' && (
        <div className="flex items-center gap-2">
          <Label className="text-xs font-bold text-muted-foreground">Select Date:</Label>
          <Input
            type="date"
            value={customStatsDate}
            onChange={(e) => setCustomStatsDate(e.target.value)}
            className="h-8 py-0.5 text-xs font-extrabold w-36 rounded-lg"
          />
        </div>
      )}
    </div>
  );
};
