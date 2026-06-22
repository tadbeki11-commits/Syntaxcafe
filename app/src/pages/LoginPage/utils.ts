export const getRoleColors = (role: string) => {
  const colors: Record<string, string> = {
    cashier: "bg-success hover:bg-success/90 text-success-foreground",
    admin: "bg-primary hover:bg-primary/90 text-primary-foreground",
  };
  return colors[role] || "bg-muted hover:bg-muted/80 text-muted-foreground";
};

export const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    cashier: "Cashier",
    admin: "Admin",
  };
  return labels[role] || "Staff";
};

export const getUserInitials = (fullName: string) => {
  return fullName
    .split(" ")
    .map((name) => name.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const sanitizePin = (value: string) => {
  return value.replace(/\D/g, "").slice(0, 4);
};
