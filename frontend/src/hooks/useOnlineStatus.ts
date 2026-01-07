import { useState, useEffect } from 'react';
import { syncManager } from '../utils/syncManager';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(syncManager.getOnlineStatus());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((online) => {
      setIsOnline(online);
      if (online) {
        handleSync();
      }
    });

    return unsubscribe;
  }, []);

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const result = await syncManager.processSyncQueue();
      if (result.success && result.failed === 0) {
        setSyncStatus('success');
        setLastSyncTime(new Date());
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      setSyncStatus('error');
      console.error('Sync failed:', error);
    } finally {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const forceSync = async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await handleSync();
  };

  return {
    isOnline,
    lastSyncTime,
    syncStatus,
    forceSync
  };
};
