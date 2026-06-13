import { useCallback, useEffect, useState } from 'react';
import api from '@/application';

export const useStockLocations = (includeInactive = true) => {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.stockLocations.getAll(includeInactive);
      const list = response.data?.data?.locations ?? response.data?.locations ?? [];
      setLocations(list);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load stock locations');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (command: Record<string, any>) => {
    const created = await api.stockLocations.create(command);
    await refresh();
    return created.data?.data?.location ?? created.data?.location ?? created;
  }, [refresh]);

  const update = useCallback(async (command: Record<string, any>) => {
    const updated = await api.stockLocations.update(command.id, command);
    await refresh();
    return updated.data?.data?.location ?? updated.data?.location ?? updated;
  }, [refresh]);

  const deactivate = useCallback(async (id: string) => {
    const result = await api.stockLocations.deactivate(id);
    await refresh();
    return result;
  }, [refresh]);

  return {
    loading,
    locations,
    error,
    refresh,
    create,
    update,
    deactivate,
  };
};
