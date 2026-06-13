import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApplication } from '@/presentation/hooks/useApplication';
import { useStockLocations } from '@/presentation/hooks/useStockLocations';
import { syncEngine } from '@/infrastructure/sync/sync-engine';
import {
  DEFAULT_STOCK_LOCATION_FORM,
  nameToSlug,
  StockLocation,
  StockLocationFormData,
} from '../types';

const dtoToUi = (dto: any): StockLocation => ({
  id: dto.id,
  name: dto.name,
  slug: dto.slug,
  description: dto.description ?? '',
  location_type: dto.location_type,
  is_default: dto.is_default,
  is_active: dto.is_active,
  display_order: dto.display_order,
  linked_main_category_slug: dto.linked_main_category_slug,
});

export const useStockLocationData = () => {
  const { menu } = useApplication();
  const {
    loading,
    locations: locationDtos,
    refresh,
    create,
    update,
    deactivate,
  } = useStockLocations(true);

  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [mainCategories, setMainCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StockLocation | null>(null);
  const [formData, setFormData] = useState<StockLocationFormData>({ ...DEFAULT_STOCK_LOCATION_FORM });
  const [saving, setSaving] = useState(false);

  const [syncStatus, setSyncStatus] = useState({
    online: true,
    syncing: false,
    unsyncedCount: 0,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (syncStatus.syncing) return;
    if (!syncStatus.online) {
      toast.error('You are offline. Cannot sync right now.');
      return;
    }
    toast.loading('Refreshing stock locations...', { id: 'manual-sync-progress' });
    try {
      await refresh();
      toast.success('Stock locations refreshed!', {
        id: 'manual-sync-progress',
      });
    } catch (e) {
      toast.error('Refresh failed.', {
        id: 'manual-sync-progress',
      });
    }
  };

  useEffect(() => {
    setLocations(locationDtos.map(dtoToUi));
  }, [locationDtos]);

  const fetchMainCategories = useCallback(async () => {
    try {
      const response = await menu.getMainCategories();
      const list =
        (response as any)?.data?.data?.mainCategories ??
        (response as any)?.data?.mainCategories ??
        [];
      setMainCategories(Array.isArray(list) ? list : []);
    } catch {
      setMainCategories([]);
    }
  }, []);

  useEffect(() => {
    void fetchMainCategories();
  }, [fetchMainCategories]);

  const openAdd = () => {
    setSelectedLocation(null);
    setFormData({ ...DEFAULT_STOCK_LOCATION_FORM });
    setDialogOpen(true);
  };

  const openEdit = (location: StockLocation) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name,
      slug: location.slug,
      description: location.description || '',
      location_type: (location.location_type as StockLocationFormData['location_type']) || 'storage',
      is_default: location.is_default,
      is_active: location.is_active,
      display_order: location.display_order ?? 0,
      linked_main_category_slug: location.linked_main_category_slug || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Location name is required');
      return;
    }

    const slug = formData.slug.trim() || nameToSlug(formData.name);
    const payload = {
      name: formData.name.trim(),
      slug,
      description: formData.description || null,
      locationType: formData.location_type,
      isDefault: formData.is_default,
      isActive: formData.is_active,
      displayOrder: Number(formData.display_order) || 0,
      linkedMainCategorySlug: formData.linked_main_category_slug || null,
    };

    try {
      setSaving(true);
      if (selectedLocation?.id) {
        await update({ id: String(selectedLocation.id), ...payload });
        toast.success('Stock location updated');
      } else {
        await create(payload);
        toast.success('Stock location created');
      }
      setDialogOpen(false);
      await refresh();
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to save stock location');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (location: StockLocation) => {
    if (
      !window.confirm(
        `Deactivate "${location.name}"? It will no longer appear in stock operations.`,
      )
    ) {
      return;
    }

    try {
      await deactivate(String(location.id));
      toast.success('Stock location deactivated');
      await refresh();
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to deactivate stock location');
    }
  };

  return {
    loading,
    locations,
    mainCategories,
    dialogOpen,
    setDialogOpen,
    selectedLocation,
    formData,
    setFormData,
    saving,
    openAdd,
    openEdit,
    handleSubmit,
    handleDeactivate,
    fetchLocations: refresh,
    syncStatus,
    handleManualSync,
  };
};

export default useStockLocationData;
