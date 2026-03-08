// Persistence retry queue for failed API writes.
// Retries with exponential backoff during the current session.

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

export interface SyncItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  retries: number;
  createdAt: number;
}

type SyncExecutor = (item: SyncItem) => Promise<void>;

let _queue: SyncItem[] = [];
let _isProcessing = false;
const _executors: Record<string, SyncExecutor> = {};
let _onQueueChange: ((pending: number) => void) | null = null;

export function registerSyncExecutor(type: string, executor: SyncExecutor) {
  _executors[type] = executor;
}

export function onSyncQueueChange(callback: (pending: number) => void) {
  _onQueueChange = callback;
}

function notifyChange() {
  _onQueueChange?.(_queue.length);
}

export function enqueueSync(item: { type: string; payload: Record<string, unknown> }) {
  const syncItem: SyncItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    retries: 0,
    createdAt: Date.now(),
  };
  _queue.push(syncItem);
  notifyChange();
  processQueue();
}

export function getPendingSyncCount(): number {
  return _queue.length;
}

async function processQueue() {
  if (_isProcessing || _queue.length === 0) return;
  _isProcessing = true;

  while (_queue.length > 0) {
    const item = _queue[0];
    const executor = _executors[item.type];

    if (!executor) {
      _queue.shift();
      continue;
    }

    try {
      await executor(item);
      _queue.shift();
      notifyChange();
    } catch {
      item.retries++;
      if (item.retries >= MAX_RETRIES) {
        console.warn(`Sync item ${item.id} (${item.type}) failed after ${MAX_RETRIES} retries, dropping`);
        _queue.shift();
        notifyChange();
      } else {
        const delay = BASE_DELAY_MS * Math.pow(2, item.retries - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  _isProcessing = false;
}

export function clearSyncQueue() {
  _queue = [];
  notifyChange();
}
