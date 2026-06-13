import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import {
  getApproximateServerDate,
  getApproximateServerDateString,
} from '@/shared/utils/serverTime';
import { Label } from '@/components/ui/label';

interface DateFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({ selectedDate, onDateChange }) => {
  const getDateOptions = () => {
    const options = [];
    const today = getApproximateServerDate();

    options.push({ key: 'all', label: 'All', date: null });
    const todayIso = getApproximateServerDateString();
    options.push({ key: 'today', label: 'Today', date: todayIso });

    for (let i = 1; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      options.push({
        key: dateStr,
        label: i === 1 ? 'Yesterday' : `${dayName}, ${monthDay}`,
        date: dateStr
      });
    }

    return options;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Date Filter</h3>
        </div>
        <span className="text-xs text-muted-foreground">Select a date range</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {getDateOptions().map((option) => (
          <Button
            key={option.key}
            variant={selectedDate === option.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDateChange(option.key)}
            className={`text-xs font-medium h-9 px-4 transition-all ${
              selectedDate === option.key 
                ? 'shadow-sm ring-2 ring-primary/20' 
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
