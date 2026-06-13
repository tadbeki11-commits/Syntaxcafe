export const ADMIN_DASHBOARD_CACHE_KEY = "admin_dashboard_v1";
export const ADMIN_DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

export const BUSINESS_UNITS = [
  { value: "all", label: "All Units" },
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "barista", label: "Barista" },
];

export const TIME_RANGE_OPTIONS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "custom", label: "Custom" },
];

export const MANAGEMENT_CENTER_ITEMS = [
  {
    label: "Employees",
    desc: "Staff performance",
    path: "/dashboard/employees",
  },
  { label: "Payments", desc: "Ledger records", path: "/dashboard/payments" },

  { label: "Reports", desc: "XLSX export", path: "/dashboard/reports" },
  { label: "Tables", desc: "Floor plans", path: "/dashboard/tables" },
  {
    label: "Inventory",
    desc: "Ingredient counts",
    path: "/dashboard/inventory",
  },
  {
    label: "Settings",
    desc: "System configuration",
    path: "/dashboard/settings/data-management",
  },
  {
    label: "Printers",
    desc: "Thermal printer setup",
    path: "/dashboard/settings/printer-settings",
  },
  { label: "Profile", desc: "Account credentials", path: "/dashboard/profile" },
];
