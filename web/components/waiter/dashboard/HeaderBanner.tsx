/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Clock, LogOut, Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BranchBadge from "@/components/waiter/BranchBadge";

interface HeaderBannerProps {
  userName?: string;
  attendanceStatus: any;
  onClockIn: () => void;
  onClockOut: () => void;
  onLogout: () => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  userName,
  attendanceStatus,
  onClockIn,
  onClockOut,
  onLogout,
}) => {
  return (
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background shadow-sm">
      <CardContent className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2.5 rounded-2xl text-primary">
            <Coffee className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-extrabold text-foreground">
                Café Table Service
              </h1>
              <BranchBadge />
            </div>
            <p className="text-xs text-muted-foreground font-semibold">
              Welcome, {userName || "Waiter"} • Manage orders and shifts
              efficiently
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {attendanceStatus ? (
            <div className="flex items-center gap-3">
              <Badge
                variant="success"
                className="h-9 px-3 text-xs font-bold gap-1"
              >
                <Clock className="w-3.5 h-3.5" />
                Clocked in at{" "}
                {new Date(attendanceStatus.clock_in_time).toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
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
            <Button onClick={onClockIn} size="sm" className="h-9 text-xs font-bold">
              <Clock className="w-4 h-4 mr-2" />
              Clock In
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="h-9 text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeaderBanner;
