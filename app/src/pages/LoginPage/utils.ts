export const getRoleColors = (role: string) => {
  const colors: Record<string, string> = {
    cafe_waiter: "bg-info hover:bg-info/90 text-info-foreground",
    cashier: "bg-success hover:bg-success/90 text-success-foreground",
    kitchen_staff: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    admin: "bg-primary hover:bg-primary/90 text-primary-foreground",
  };
  return colors[role] || "bg-muted hover:bg-muted/80 text-muted-foreground";
};

export const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    cafe_waiter: "Waiter",
    cashier: "Cashier",
    kitchen_staff: "Kitchen",
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
