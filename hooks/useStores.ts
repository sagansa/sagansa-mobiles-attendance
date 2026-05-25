import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { fetchShiftStores, fetchStores } from '@/lib/api';
import { ShiftStoreSummary, StoreSummary } from '@/types/api';

export function useStores() {
  const { token, isAuthenticated } = useAuth();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [shiftStores, setShiftStores] = useState<ShiftStoreSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setStores([]);
      setShiftStores([]);
      return;
    }

    setIsLoading(true);
    try {
      const [storeList, shiftList] = await Promise.all([
        fetchStores(token),
        fetchShiftStores(token),
      ]);

      setStores(storeList ?? []);
      setShiftStores(shiftList ?? []);
    } catch (error) {
      console.warn('Gagal memuat store/shift', error);
      setStores([]);
      setShiftStores([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    stores,
    shiftStores,
    isLoading,
    refresh: load,
  };
}
