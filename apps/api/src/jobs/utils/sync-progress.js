const FLUSH_INTERVAL_MS = 10_000;

export class SyncProgressReporter {
  constructor(syncJob) {
    this._syncJob = syncJob;
    this._dirty = false;
    this._pending = {};
    this._lastFlush = 0;
    this._processedItems = syncJob.processedItems || 0;
    this._totalItems = syncJob.totalItems || 0;
    this._currentPhase = syncJob.currentPhase || null;
  }

  setPhase(text) {
    this._currentPhase = text;
    this._pending.currentPhase = text;
    this._dirty = true;
    this._maybeFlush();
  }

  increment(count = 1) {
    this._processedItems += count;
    this._pending.processedItems = this._processedItems;
    this._dirty = true;
    this._maybeFlush();
  }

  setTotal(n) {
    this._totalItems = n;
    this._pending.totalItems = n;
    this._dirty = true;
    this._maybeFlush();
  }

  async isCancelled() {
    await this._syncJob.reload({ attributes: ['status'] });
    return this._syncJob.status === 'cancelled';
  }

  async _maybeFlush() {
    const now = Date.now();
    if (now - this._lastFlush >= FLUSH_INTERVAL_MS) {
      await this.flush();
    }
  }

  async flush() {
    if (!this._dirty) return;
    const data = { ...this._pending };
    this._pending = {};
    this._dirty = false;
    this._lastFlush = Date.now();
    await this._syncJob.update(data);
  }
}
