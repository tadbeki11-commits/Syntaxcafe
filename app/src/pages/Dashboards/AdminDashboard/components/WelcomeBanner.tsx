import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import BranchBadge from '@/components/common/BranchBadge';
import { getApproximateServerDate } from '@/shared/utils/serverTime';

export const WelcomeBanner: React.FC = () => {
  const { user } = useAuth() as any;

  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background">
      <CardContent className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2.5 rounded-2xl">
            <img
              src="/assets/logo.png?v=8"
              alt="Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                Welcome back, <span className="text-primary">{user?.full_name}</span>!
              </h1>
              <BranchBadge />
            </div>
            <p className="text-xs text-muted-foreground font-semibold flex items-center mt-0.5">
              <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
              Here's what's happening at your business today.
            </p>
          </div>
        </div>

        <div className="flex items-center text-xs font-bold text-muted-foreground border bg-muted/20 px-4 py-2 rounded-xl h-fit">
          <Calendar className="w-4 h-4 mr-2 text-primary" />
          <span>{getApproximateServerDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </CardContent>
    </Card>
  );
};
