import { AuthHttpClient } from '../src/api/authHttpClient';
import { ApiError } from '../src/api/interfaces';
import { DEMO_PASSWORD } from '../src/mocks/data';
import { MockApiClient } from '../src/mocks/MockApiClient';
import type { TokenStore } from '../src/services/tokenStorage';
import type { AuthTokens } from '../src/types/market';

class MemoryTokenStore implements TokenStore {
  public tokens: AuthTokens | null = null;

  async getTokens(): Promise<AuthTokens | null> {
    return this.tokens ? { ...this.tokens } : null;
  }

  async saveTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = { ...tokens };
  }

  async clearTokens(): Promise<void> {
    this.tokens = null;
  }
}

describe('AuthHttpClient single-flight token refresh', () => {
  test('concurrent 401 failures trigger exactly one refresh call and retry all requests', async () => {
    let clock = 1_000_000;
    const mockApi = new MockApiClient({
      minDelayMs: 5,
      maxDelayMs: 5,
      tokenTtlMs: 60_000,
      now: () => clock,
    });
    const store = new MemoryTokenStore();
    const onExpired = jest.fn();
    const client = new AuthHttpClient(mockApi, store, onExpired);

    const initialTokens = await client.login({
      email: 'trader@example.com',
      password: DEMO_PASSWORD,
    });

    // Advance past the 60s access token TTL so all 3 calls fail with 401.
    clock += 61_000;

    const [acct1, symbols, acct2] = await Promise.all([
      client.getAccount(),
      client.getSymbols(),
      client.getAccount(),
    ]);

    expect(acct1.success).toBe(true);
    expect(symbols.payload).toHaveLength(30);
    expect(acct2.success).toBe(true);
    expect(mockApi.refreshCallCount).toBe(1);
    expect(onExpired).not.toHaveBeenCalled();

    const updatedTokens = await store.getTokens();
    expect(updatedTokens).not.toBeNull();
    expect(updatedTokens?.accessToken).not.toBe(initialTokens.accessToken);
    expect(updatedTokens?.refreshToken).toBe(initialTokens.refreshToken);
  });

  test('failed refresh clears stored tokens and invokes session-expired callback', async () => {
    let clock = 2_000_000;
    const mockApi = new MockApiClient({
      minDelayMs: 0,
      maxDelayMs: 0,
      tokenTtlMs: 60_000,
      now: () => clock,
    });
    const store = new MemoryTokenStore();
    const onExpired = jest.fn();
    const client = new AuthHttpClient(mockApi, store, onExpired);

    const tokens = await client.login({
      email: 'trader@example.com',
      password: DEMO_PASSWORD,
    });

    // Expire access token and invalidate refresh token.
    clock += 61_000;
    mockApi.invalidateRefreshToken(tokens.refreshToken);

    await expect(
      Promise.all([client.getAccount(), client.getSymbols()]),
    ).rejects.toBeInstanceOf(ApiError);

    expect(mockApi.refreshCallCount).toBe(1);
    expect(await store.getTokens()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  test('does not refresh when endpoint returns a non-401 error', async () => {
    const mockApi = new MockApiClient({
      minDelayMs: 0,
      maxDelayMs: 0,
      orderDelayMs: 0,
    });
    const store = new MemoryTokenStore();
    const client = new AuthHttpClient(mockApi, store);

    await client.login({
      email: 'trader@example.com',
      password: DEMO_PASSWORD,
    });

    // MockApiClient rejects every 5th order with 409 ORDER_REJECTED.
    for (let i = 0; i < 4; i += 1) {
      await client.placeTrade({ symbol: 'EURUSD', side: 'buy', volume: 0.1 });
    }

    await expect(
      client.placeTrade({ symbol: 'EURUSD', side: 'buy', volume: 0.1 }),
    ).rejects.toMatchObject({ status: 409 });

    expect(mockApi.refreshCallCount).toBe(0);
  });
});

