import type { PriceFeed, TickHandler } from '../api/interfaces';
import type { PriceTick } from '../types/market';
import { SEED_PRICES, SYMBOLS } from './data';

interface InternalQuote {
  bid: number;
  spread: number;
  digits: number;
}

interface SubscriptionEntry {
  symbols: Set<string>;
  onTicks: TickHandler;
}

function roundTo(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

/**
 * Computes display spread in pips/points matching the brief's EURUSD example:
 * 0.00013 across 5 digits -> 1.3
 */
function toDisplaySpread(rawSpread: number, digits: number): number {
  const scale = digits > 0 ? Math.pow(10, digits - 1) : 1;
  return Number((rawSpread * scale).toFixed(1));
}

export class MockPriceFeed implements PriceFeed {
  private readonly quotes = new Map<string, InternalQuote>();
  private readonly subscribers = new Set<SubscriptionEntry>();
  private timerId: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  // 10 ticks every 50 ms = ~200 ticks/sec across the 30 symbols.
  private readonly burstIntervalMs: number;
  private readonly ticksPerBurst: number;

  constructor(burstIntervalMs = 50, ticksPerBurst = 10) {
    this.burstIntervalMs = burstIntervalMs;
    this.ticksPerBurst = ticksPerBurst;

    const digitsBySymbol = new Map(SYMBOLS.map(s => [s.symbol, s.digits]));
    for (const seed of SEED_PRICES) {
      this.quotes.set(seed.symbol, {
        bid: seed.bid,
        spread: seed.spread,
        digits: digitsBySymbol.get(seed.symbol) ?? 5,
      });
    }
  }

  connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.timerId = setInterval(() => this.emitBurst(), this.burstIntervalMs);
  }

  disconnect(): void {
    this.connected = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  subscribe(symbols: string[], onTicks: TickHandler): () => void {
    const symbolSet = new Set(symbols);
    const entry: SubscriptionEntry = { symbols: symbolSet, onTicks };
    this.subscribers.add(entry);

    // Deliver current snapshot immediately so newly mounted screens have live prices right away.
    const snapshot: PriceTick[] = [];
    const nowSec = Math.floor(Date.now() / 1000);
    for (const symbol of symbolSet) {
      const tick = this.buildTick(symbol, nowSec);
      if (tick) {
        snapshot.push(tick);
      }
    }
    if (snapshot.length > 0) {
      onTicks(snapshot);
    }

    return () => {
      this.subscribers.delete(entry);
    };
  }

  getLatestSnapshot(symbol: string): { bid: number; ask: number } | undefined {
    const quote = this.quotes.get(symbol);
    if (!quote) {
      return undefined;
    }
    return {
      bid: roundTo(quote.bid, quote.digits),
      ask: roundTo(quote.bid + quote.spread, quote.digits),
    };
  }

  private buildTick(symbol: string, dateTime: number): PriceTick | null {
    const quote = this.quotes.get(symbol);
    if (!quote) {
      return null;
    }
    const bid = roundTo(quote.bid, quote.digits);
    const ask = roundTo(quote.bid + quote.spread, quote.digits);
    return {
      symbol,
      bid,
      ask,
      spread: toDisplaySpread(ask - bid, quote.digits),
      dateTime,
    };
  }

  private emitBurst(): void {
    if (!this.connected || this.subscribers.size === 0) {
      return;
    }

    const symbolKeys = SEED_PRICES.map(item => item.symbol);
    const nowSec = Math.floor(Date.now() / 1000);
    const burst: PriceTick[] = [];

    for (let i = 0; i < this.ticksPerBurst; i += 1) {
      const symbol = symbolKeys[Math.floor(Math.random() * symbolKeys.length)];
      const quote = this.quotes.get(symbol);
      if (!quote) {
        continue;
      }

      // Random walk within +-spread; clamp above a tiny positive floor.
      const delta = (Math.random() * 2 - 1) * quote.spread;
      const minBid = Math.pow(10, -quote.digits);
      quote.bid = Math.max(minBid, quote.bid + delta);

      const tick = this.buildTick(symbol, nowSec);
      if (tick) {
        burst.push(tick);
      }
    }

    if (burst.length === 0) {
      return;
    }

    for (const sub of this.subscribers) {
      const filtered = burst.filter(tick => sub.symbols.has(tick.symbol));
      if (filtered.length > 0) {
        sub.onTicks(filtered);
      }
    }
  }
}

