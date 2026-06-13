import React from 'react';
import { AlertTriangle, Wrench, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface BackOfHouseUtilitiesProps {
  // Can be extended with actual handlers if needed
}

export const BackOfHouseUtilities: React.FC<BackOfHouseUtilitiesProps> = () => {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <CardTitle className="text-xs uppercase font-extrabold tracking-wide">Back of House Utilities</CardTitle>
        <CardDescription className="text-[10px] font-semibold mt-0.5">Operational controls and safety parameters</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 rounded-xl border hover:bg-muted/30">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="font-extrabold text-[10px]">Priority Recipes</span>
        </Button>

        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 rounded-xl border hover:bg-muted/30">
          <Wrench className="w-4 h-4 text-primary" />
          <span className="font-extrabold text-[10px]">Kitchen Diagnostics</span>
        </Button>

        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 rounded-xl border hover:bg-muted/30">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-extrabold text-[10px]">Duty Rotations</span>
        </Button>

        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 rounded-xl border hover:bg-muted/30">
          <User className="w-4 h-4 text-primary" />
          <span className="font-extrabold text-[10px]">Cook Profile</span>
        </Button>
      </CardContent>
    </Card>
  );
};
