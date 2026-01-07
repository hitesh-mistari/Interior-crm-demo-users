const DB_NAME = 'artistic-engineers-db';
const DB_VERSION = 3;

export interface DBSchema {
  projects: any[];
  expenses: any[];
  payments: any[];
  quotations: any[];
  materials: any[];
  products: any[];
  suppliers: any[];
  supplierPayments: any[];
  tasks: any[];
  bankAccounts: any[];
  syncQueue: SyncQueueItem[];
}

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entity: keyof Omit<DBSchema, 'syncQueue'>;
  data: any;
  timestamp: number;
  retries: number;
}

let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      const stores = [
        'projects',
        'expenses',
        'payments',
        'quotations',
        'materials',
        'products',
        'suppliers',
        'supplierPayments',
        'tasks',
        'bankAccounts',
        'syncQueue'
      ];

      stores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });

          if (storeName === 'syncQueue') {
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('entity', 'entity', { unique: false });
          } else {
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
        }
      });
    };
  });
};

export const getAll = async <T>(storeName: keyof DBSchema): Promise<T[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getById = async <T>(storeName: keyof DBSchema, id: string): Promise<T | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const add = async <T>(storeName: keyof DBSchema, data: T): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const put = async <T>(storeName: keyof DBSchema, data: T): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const remove = async (storeName: keyof DBSchema, id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clear = async (storeName: keyof DBSchema): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const addToSyncQueue = async (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<void> => {
  const queueItem: SyncQueueItem = {
    ...item,
    id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retries: 0
  };
  await add('syncQueue', queueItem);
};

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
  return getAll<SyncQueueItem>('syncQueue');
};

export const removeSyncQueueItem = async (id: string): Promise<void> => {
  await remove('syncQueue', id);
};

export const updateSyncQueueItem = async (id: string, updates: Partial<SyncQueueItem>): Promise<void> => {
  const item = await getById<SyncQueueItem>('syncQueue', id);
  if (item) {
    await put('syncQueue', { ...item, ...updates });
  }
};

export const bulkPut = async <T extends { id: string }>(
  storeName: keyof DBSchema,
  items: T[]
): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    let completed = 0;
    const total = items.length;

    if (total === 0) {
      resolve();
      return;
    }

    items.forEach((item) => {
      const request = store.put(item);
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  });
};
