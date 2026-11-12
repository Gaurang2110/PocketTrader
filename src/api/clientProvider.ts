import type { ApiClient, PriceFeed } from './interfaces';
import { AuthHttpClient } from './authHttpClient';
import { MockApiClient } from '../mocks/MockApiClient';
import { MockPriceFeed } from '../mocks/MockPriceFeed';
import { tokenStore } from '../services/tokenStorage';

// Single composition root: swap MockApiClient / MockPriceFeed for real
// HTTP and WebSocket implementations here without changing any UI or state code.
const mockPriceFeed = new MockPriceFeed();
const mockApiClient = new MockApiClient({
  getLivePrice: symbol => mockPriceFeed.getLatestSnapshot(symbol),
});

export const apiClient: ApiClient = mockApiClient;
export const priceFeed: PriceFeed = mockPriceFeed;
export const authClient = new AuthHttpClient(apiClient, tokenStore);

export function debugExpireCurrentToken(): void {
  const token = authClient.getCurrentAccessToken();
  if (token) {
    mockApiClient.expireToken(token);
  }
}

export function getMockDiagnostics(): { refreshCalls: number; protectedCalls: number } {
  return {
    refreshCalls: mockApiClient.refreshCallCount,
    protectedCalls: mockApiClient.protectedCallCount,
  };
}
