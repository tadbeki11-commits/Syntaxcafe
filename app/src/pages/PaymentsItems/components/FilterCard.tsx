import React from 'react';
import { Calendar, BarChart3, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface FilterCardProps {
  timeFilter: string;
  setTimeFilter: (val: string) => void;
  customMode: 'specific' | 'range';
  setCustomMode: (val: 'specific' | 'range') => void;
  customDate: string;
  setCustomDate: (val: string) => void;
  customFrom: string;
  setCustomFrom: (val: string) => void;
  customTo: string;
  setCustomTo: (val: string) => void;
  unitFilter: string;
  setUnitFilter: (val: string) => void;
  viewingLabel: string;
}

export const FilterCard: React.FC<FilterCardProps> = ({
  timeFilter,
  setTimeFilter,
  customMode,
  setCustomMode,
  customDate,
  setCustomDate,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  unitFilter,
  setUnitFilter,
  viewingLabel
}) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap gap-1.5 pb-2 border-b">
          {['all', 'today', 'week', 'month', 'custom'].map((filter) => (
            <Button
              key={filter}
              variant={timeFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter(filter)}
              className="capitalize text-xs font-bold"
            >
              {filter}
            </Button>
          ))}
        </div>

        {timeFilter === 'custom' && (
          <div className="rounded-xl border p-4 bg-muted/40 space-y-4">
            <div className="grid grid-cols-2 gap-2 max-w-xs">
              <Button
                variant={customMode === 'specific' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCustomMode('specific')}
                className="text-xs font-semibold"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Specific Date
              </Button>
              <Button
                variant={customMode === 'range' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCustomMode('range')}
                className="text-xs font-semibold"
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                Date Range
              </Button>
            </div>

            <div className="pt-1">
              {customMode === 'specific' ? (
                <div className="flex items-center gap-3 bg-background border rounded-xl px-3 py-1.5 max-w-xs">
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-semibold"
                  />
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 bg-background border rounded-xl px-3 py-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">From</span>
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-background border rounded-xl px-3 py-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">To</span>
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="inline-flex bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-3 py-1.5 text-xs font-semibold items-center gap-2">
              <CheckCircle className="w-4 h-4 text-warning" />
              Viewing ledger for: {viewingLabel}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {['all', 'cafe', 'barista', 'restaurant'].map((unit) => (
            <Badge
              key={unit}
              onClick={() => setUnitFilter(unit)}
              variant={unitFilter === unit ? 'default' : 'secondary'}
              className="cursor-pointer capitalize text-[10px] py-1 px-2.5 font-bold"
            >
              {unit}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterCard;
