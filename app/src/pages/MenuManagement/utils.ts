export const normCat = (v: string) => {
  const s = String(v || '').trim().toLowerCase();
  return s === 'restaurant' ? 'cafe' : (s || 'cafe');
};

export const isFasting = (c: string) => {
  const v = normCat(c);
  return v === 'fasting' || v === 'fasting_break';
};

export const slugifyCategory = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const getItemCategories = (item: any) => {
  const categories = Array.isArray(item?.categories) ? item.categories : [];
  if (categories.length > 0) return categories;
  const fallback = item?.category || item?.sub_category || 'cafe';
  return [
    {
      name: fallback,
      slug: slugifyCategory(fallback),
      type: 'main',
    },
  ];
};

export const itemHasCategory = (item: any, category: string) => {
  const normalized = slugifyCategory(category);
  return getItemCategories(item).some(
    (entry: any) =>
      slugifyCategory(entry.slug || entry.name) === normalized ||
      normCat(entry.name) === normCat(category),
  );
};
