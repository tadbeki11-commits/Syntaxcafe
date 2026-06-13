import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatBirr } from '../utils';

interface CreditBadgeProps {
  balance: number;
}

export const CreditBadge = ({ balance }: CreditBadgeProps) => {
  const isNeg = balance < 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isNeg ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
      {isNeg ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
      {formatBirr(Math.abs(balance))} {isNeg ? 'overdrawn' : 'credit'}
    </span>
  );
};
