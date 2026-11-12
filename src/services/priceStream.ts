import type { PriceFeed } from '../api/interfaces';
import type { PriceTick } from '../types/market';

export function dedupeLatestTicks(ticks: PriceTick[]): PriceTick[] {
  const latestBySymbol = new Map<string, PriceTick>();
  for (const tick of ticks) {
    latestBySymbol.set(tick.symbol, tick);
  }
  return Array.from(latestBySymbol.values());
}

export class PriceStreamService {
  private readonly feed: PriceFeed;
  private readonly batchIntervalMs: number;
  private readonly onFlush: (ticks: PriceTick[]) => void;

  private readonly refCounts = new Map<string, number>();
  private readonly pending = new Map<string, PriceTick>();
  private unsubscribeFeed: (() => void) | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private active = false;

  constructor(
    feed: PriceFeed,
    onFlush: (ticks: PriceTick[]) => void,
    batchIntervalMs = 200,
  ) {
    this.feed = feed;
    this.onFlush = onFlush;
    this.batchIntervalMs = batchIntervalMs;
  }

  start(): void {
    if (this.active) {
      return;
    }
    this.active = true;
    this.feed.connect();
    this.flushTimer = setInterval(() => this.flush(), this.batchIntervalMs);
    this.syncSubscription();
  }

  stop(): void {
    this.active = false;
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.unsubscribeFeed?.();
    this.unsubscribeFeed = null;
    this.pending.clear();
    this.feed.disconnect();
  }

  acquire(symbols: string[]): () => void {
    const unique = Array.from(new Set(symbols));
    if (unique.length === 0) {
      return () => {};
    }

    let changed = false;
    for (const symbol of unique) {
      const prev = this.refCounts.get(symbol) ?? 0;
      this.refCounts.set(symbol, prev + 1);
      if (prev === 0) {
        changed = true;
      }
    }

    if (changed) {
      this.syncSubscription();
    }

    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;

      let removedAny = false;
      for (const symbol of unique) {
        const current = this.refCounts.get(symbol) ?? 0;
        if (current <= 1) {
          this.refCounts.delete(symbol);
          removedAny = true;
        } else {
          this.refCounts.set(symbol, current - 1);
        }
      }

      if (removedAny) {
        this.syncSubscription();
      }
    };
  }

  flush(): void {
    if (this.pending.size === 0) {
      return;
    }
    const batch = Array.from(this.pending.values());
    this.pending.clear();
    this.onFlush(batch);
  }

  private syncSubscription(): void {
    this.unsubscribeFeed?.();
    this.unsubscribeFeed = null;

    if (!this.active) {
      return;
    }

    const activeSymbols = Array.from(this.refCounts.keys());
    if (activeSymbols.length === 0) {
      return;
    }

    this.unsubscribeFeed = this.feed.subscribe(activeSymbols, ticks => {
      for (const tick of ticks) {
        // Keep only the latest tick per symbol within the burst and 200ms window.
        this.pending.set(tick.symbol, tick);
      }
    });

    // Flush any synchronous initial snapshot delivered by subscribe() so newly visible rows render immediately.
    if (this.pending.size > 0) {
      this.flush();
    }
  }
}

