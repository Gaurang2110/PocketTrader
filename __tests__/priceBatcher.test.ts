import type { PriceFeed, TickHandler } from '../src/api/interfaces';
import { MockPriceFeed } from '../src/mocks/MockPriceFeed';
import {
  PriceStreamService,
  dedupeLatestTicks,
} from '../src/services/priceStream';
import type { PriceTick } from '../src/types/market';

class FakeFeed implements PriceFeed {
  public connected = false;
  public lastSubscribed: string[] = [];
  private handler: TickHandler | null = null;

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  subscribe(symbols: string[], onTicks: TickHandler): () => void {
    this.lastSubscribed = symbols;
    this.handler = onTicks;
    return () => {
      this.handler = null;
    };
  }

  emit(ticks: PriceTick[]): void {
    this.handler?.(ticks);
  }
}

describe('price burst deduplication and batching', () => {
  test('keeps only the latest tick for each symbol inside a burst', () => {
    const burst: PriceTick[] = [
      { symbol: 'EURUSD', bid: 1.0841, ask: 1.08422, spread: 1.2, dateTime: 100 },
      { symbol: 'XAUUSD', bid: 2650.1, ask: 2650.35, spread: 2.5, dateTime: 100 },
      { symbol: 'EURUSD', bid: 1.0843, ask: 1.08442, spread: 1.2, dateTime: 101 },
    ];

    const deduped = dedupeLatestTicks(burst);
    expect(deduped).toHaveLength(2);
    expect(deduped.find(t => t.symbol === 'EURUSD')?.bid).toBe(1.0843);
    expect(deduped.find(t => t.symbol === 'XAUUSD')?.bid).toBe(2650.1);
  });

  test('batches burst ticks over 200ms and reference-counts symbol subscriptions', () => {
    jest.useFakeTimers();
    const feed = new FakeFeed();
    const flushedBatches: PriceTick[][] = [];
    const stream = new PriceStreamService(
      feed,
      batch => flushedBatches.push(batch),
      200,
    );

    stream.start();
    const releaseMarketWatch = stream.acquire(['EURUSD', 'GBPUSD']);
    const releaseOrder = stream.acquire(['EURUSD']);

    expect(feed.lastSubscribed.sort()).toEqual(['EURUSD', 'GBPUSD']);

    feed.emit([
      { symbol: 'EURUSD', bid: 1.0841, ask: 1.08422, spread: 1.2, dateTime: 1 },
      { symbol: 'EURUSD', bid: 1.0845, ask: 1.08462, spread: 1.2, dateTime: 2 },
      { symbol: 'GBPUSD', bid: 1.2715, ask: 1.27165, spread: 1.5, dateTime: 2 },
    ]);

    expect(flushedBatches).toHaveLength(0);
    jest.advanceTimersByTime(200);

    expect(flushedBatches).toHaveLength(1);
    expect(flushedBatches[0]).toHaveLength(2);
    expect(flushedBatches[0].find(t => t.symbol === 'EURUSD')?.bid).toBe(1.0845);

    // Releasing MarketWatch keeps EURUSD alive for PlaceOrder.
    releaseMarketWatch();
    expect(feed.lastSubscribed).toEqual(['EURUSD']);

    releaseOrder();
    stream.stop();
    jest.useRealTimers();
  });

  test('MockPriceFeed filters ticks to subscribed symbols only', () => {
    jest.useFakeTimers();
    const feed = new MockPriceFeed(50, 10);
    const received: PriceTick[] = [];

    feed.connect();
    const unsubscribe = feed.subscribe(['XAUUSD'], ticks => {
      received.push(...ticks);
    });

    jest.advanceTimersByTime(200);
    expect(received.length).toBeGreaterThan(0);
    expect(received.every(t => t.symbol === 'XAUUSD')).toBe(true);

    unsubscribe();
    feed.disconnect();
    jest.useRealTimers();
  });
});

