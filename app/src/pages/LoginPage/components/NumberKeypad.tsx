import React from 'react';
import { Button } from '@/components/ui/button';
import { Delete } from 'lucide-react';

interface NumberKeypadProps {
  onNumberInput: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  isLoading: boolean;
}

export const NumberKeypad: React.FC<NumberKeypadProps> = ({
  onNumberInput,
  onClear,
  onBackspace,
  isLoading
}) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
      {numbers.slice(0, 9).map((num) => (
        <Button
          key={num}
          type="button"
          variant="outline"
          onClick={() => onNumberInput(num.toString())}
          disabled={isLoading}
          className="h-14 text-xl font-bold border-2 border-muted-foreground/30 hover:border-primary/50 rounded-xl hover:bg-primary/5 active:scale-95 transition-all"
        >
          {num}
        </Button>
      ))}
      <Button
        type="button"
        variant="destructive"
        onClick={onClear}
        disabled={isLoading}
        className="h-14 text-xs font-bold rounded-xl active:scale-95 transition-all"
      >
        Clear
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onNumberInput('0')}
        disabled={isLoading}
        className="h-14 text-xl font-bold border-2 border-muted-foreground/30 hover:border-primary/50 rounded-xl hover:bg-primary/5 active:scale-95 transition-all"
      >
        0
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onBackspace}
        disabled={isLoading}
        className="h-14 rounded-xl border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all flex items-center justify-center"
      >
        <Delete className="w-5 h-5 text-muted-foreground" />
      </Button>
    </div>
  );
};
