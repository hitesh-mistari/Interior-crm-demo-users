type QueueItem = { id: string; type: 'task-create'; payload: any };

const KEY = 'offlineQueue';

export const getQueue = (): QueueItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setQueue = (items: QueueItem[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
};

export const enqueueTaskCreate = (payload: any) => {
  const items = getQueue();
  items.push({ id: `q-${Date.now()}`, type: 'task-create', payload });
  setQueue(items);
};

export const clearQueue = () => setQueue([]);

