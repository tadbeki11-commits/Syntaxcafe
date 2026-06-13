import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MenuSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MenuSearchBar: React.FC<MenuSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search menu items, categories, or sub-items...'
}) => {
  return (
    <div className="relative w-full rounded-3xl border border-border bg-background/75 backdrop-blur-md shadow-sm px-4 py-3">
      <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-2xl border-border bg-background pl-10 pr-10 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-amber-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-7 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground/80"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default MenuSearchBar;