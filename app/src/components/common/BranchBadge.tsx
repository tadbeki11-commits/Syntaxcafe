import React from 'react';

const BRANCH_NAME = import.meta.env.VITE_BRANCH_NAME || '';

interface BranchBadgeProps {
  className?: string;
}

const BranchBadge: React.FC<BranchBadgeProps> = ({ className = '' }) => {
  if (!BRANCH_NAME) return null;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm ${className}`}
    >
      {BRANCH_NAME}
    </span>
  );
};

export default BranchBadge;
