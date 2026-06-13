import React from 'react';
import { Clipboard, Clock } from 'lucide-react';
import BranchBadge from '@/components/common/BranchBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HeaderBannerProps {
  attendanceStatus: any;
  onClockIn: () => void;
  onClockOut: () => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  attendanceStatus,
  onClockIn,
  onClockOut
}) => {
  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background shadow-sm">
      <CardContent className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2.5 rounded-2xl text-primary">
            <Clipboard className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-extrabold text-foreground">Kitchen Cookings Board</h1>
              <BranchBadge />
            </div>
            <p className="text-xs text-muted-foreground font-semibold">
              Monitor active food queues, coordinate stove recipes, and complete waiter dispatches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {attendanceStatus ? (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="h-9 px-3 text-xs font-bold gap-1 py-0 border-none">
                <Clock className="w-3.5 h-3.5" />
                Clocked in at {new Date(attendanceStatus.clock_in_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={onClockOut}
                className="h-9 text-xs font-bold"
              >
                Clock Out
              </Button>
            </div>
          ) : (
            <Button
              onClick={onClockIn}
              size="sm"
              className="h-9 text-xs font-bold gap-1 shadow-sm"
            >
              <Clock className="w-4 h-4" /> Clock In
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
