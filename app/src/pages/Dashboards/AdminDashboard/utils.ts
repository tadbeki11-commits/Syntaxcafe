export const formatCurrency = (value: any) => {
  const n = parseFloat(value);
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toLocaleString()} Birr`;
};

export const formatDate = (dateString: any) => {
  return new Date(dateString).toLocaleString();
};

export const getMenuItemDepartment = (menuItem: any): string | null => {

  const explicitMain = String(menuItem?.main_category || "")
    .trim()
    .toLowerCase();

    return explicitMain;
};
