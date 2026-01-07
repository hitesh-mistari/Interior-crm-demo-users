import { getSyncQueue, removeSyncQueueItem, updateSyncQueueItem, SyncQueueItem } from './db';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ item: SyncQueueItem; error: string }>;
}

export class SyncManager {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners(true);
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners(false);
    });
  }

  public subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(online: boolean): void {
    this.listeners.forEach((listener) => listener(online));
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async processSyncQueue(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: []
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: []
    };

    try {
      const queue = await getSyncQueue();
      const sortedQueue = queue.sort((a, b) => a.timestamp - b.timestamp);

      for (const item of sortedQueue) {
        try {
          await this.processSyncItem(item);
          await removeSyncQueueItem(item.id);
          result.processed++;
        } catch (error) {
          if (item.retries >= MAX_RETRIES) {
            result.failed++;
            result.errors.push({
              item,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            await removeSyncQueueItem(item.id);
          } else {
            await updateSyncQueueItem(item.id, {
              retries: item.retries + 1
            });
            result.failed++;
          }
        }
      }
    } catch (error) {
      result.success = false;
      console.error('Sync queue processing failed:', error);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    console.log('Processing sync item:', item);
  }

  public async forceSync(): Promise<SyncResult> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    return this.processSyncQueue();
  }
}

export const syncManager = new SyncManager();
