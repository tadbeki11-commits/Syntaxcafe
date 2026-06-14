import React from "react";
import { Loader2 } from "lucide-react";

const LoadingSpinner: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {text ? <p className="text-sm font-semibold">{text}</p> : null}
    </div>
  );
};

export default LoadingSpinner;
