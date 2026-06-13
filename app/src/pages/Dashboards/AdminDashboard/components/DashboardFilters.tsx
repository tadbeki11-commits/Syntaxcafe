import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BUSINESS_UNITS, TIME_RANGE_OPTIONS } from '../constants';

interface DashboardFiltersProps {
  businessUnit: string;
  setBusinessUnit: (value: string) => void;
  selectedMenuItemId: string;
  setSelectedMenuItemId: (value: string) => void;
  menuItems: any[];
  timeRange: string;
  setTimeRange: (value: string) => void;
  customMode: string;
  setCustomMode: (value: string) => void;
  customDate: string;
  setCustomDate: (value: string) => void;
  customStartDate: string;
  setCustomStartDate: (value: string) => void;
  customEndDate: string;
  setCustomEndDate: (value: string) => void;
  customRangeText: string;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  businessUnit,
  setBusinessUnit,
  selectedMenuItemId,
  setSelectedMenuItemId,
  menuItems,
  timeRange,
  setTimeRange,
  customMode,
  setCustomMode,
  customDate,
  setCustomDate,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  customRangeText
}) => {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={businessUnit} onValueChange={setBusinessUnit}>
              <SelectTrigger className="w-[140px] font-bold">
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_UNITS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMenuItemId}
              onValueChange={setSelectedMenuItemId}
              disabled={businessUnit === 'all'}
            >
              <SelectTrigger className="w-[180px] font-bold">
                <SelectValue placeholder="All Foods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Foods</SelectItem>
                {menuItems.map((it: any) => (
                  <SelectItem key={it.id} value={String(it.id)}>
                    {it.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-1.5 border bg-muted/20 p-1 rounded-xl">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                variant={timeRange === opt.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(opt.key)}
                className="h-8 text-xs font-bold px-3.5"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {timeRange === 'custom' && (
          <div className="bg-muted/30 border p-4 rounded-2xl space-y-3">
            <div className="flex bg-muted p-1 rounded-xl w-fit">
              <Button
                variant={customMode === 'single' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCustomMode('single')}
                className="h-7 text-xs font-bold"
              >
                Specific Date
              </Button>
              <Button
                variant={customMode === 'date_range' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCustomMode('date_range')}
                className="h-7 text-xs font-bold"
              >
                Date Range
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              {customMode === 'single' ? (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground">Select Date</Label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="max-w-[160px]"
                    />
                  </div>
                  <span className="text-muted-foreground mt-6 font-bold">→</span>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="max-w-[160px]"
                    />
                  </div>
                </div>
              )}

              {customRangeText && (
                <Badge variant="info" className="h-fit mt-6 font-bold">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Viewing: {customRangeText}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
