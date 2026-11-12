import { ApiError } from './interfaces';
import type { ApiClient } from './interfaces';
import type {
  AccountInfo,
  ApiEnvelope,
  AuthTokens,
  LoginRequest,
  SymbolItem,
  TradeRequest,
  TradeResult,
} from '../types/market';
import type { TokenStore } from '../services/tokenStorage';

export class AuthHttpClient {
  private readonly client: ApiClient;
  private readonly store: TokenStore;
  private onSessionExpired?: () => void;

  // Shared in-flight promise guarantees concurrent 401s trigger only one refresh call.
  private refreshInFlight: Promise<string> | null = null;
  private cachedTokens: AuthTokens | null = null;

  constructor(
    client: ApiClient,
    store: TokenStore,
    onSessionExpired?: () => void,
  ) {
    this.client = client;
    this.store = store;
    this.onSessionExpired = onSessionExpired;
  }

  setSessionExpiredHandler(handler: () => void): void {
    this.onSessionExpired = handler;
  }

  async restoreTokens(): Promise<AuthTokens | null> {
    const tokens = await this.store.getTokens();
    this.cachedTokens = tokens;
    return tokens;
  }

  getCurrentAccessToken(): string | null {
    return this.cachedTokens?.accessToken ?? null;
  }

  async login(body: LoginRequest): Promise<AuthTokens> {
    const response = await this.client.login(body);
    this.cachedTokens = response.payload;
    await this.store.saveTokens(response.payload);
    return response.payload;
  }

  async logout(): Promise<void> {
    this.cachedTokens = null;
    this.refreshInFlight = null;
    await this.store.clearTokens();
  }

  getAccount(): Promise<ApiEnvelope<AccountInfo>> {
    return this.withAuth(token => this.client.getAccount(token));
  }

  getSymbols(): Promise<ApiEnvelope<SymbolItem[]>> {
    return this.withAuth(token => this.client.getSymbols(token));
  }

  placeTrade(body: TradeRequest): Promise<ApiEnvelope<TradeResult>> {
    return this.withAuth(token => this.client.placeTrade(token, body));
  }

  private async ensureTokens(): Promise<AuthTokens> {
    if (this.cachedTokens) {
      return this.cachedTokens;
    }
    const stored = await this.store.getTokens();
    if (!stored) {
      throw new ApiError('No active session', 401);
    }
    this.cachedTokens = stored;
    return stored;
  }

  private async withAuth<T>(
    operation: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const tokens = await this.ensureTokens();
    const usedAccessToken = tokens.accessToken;

    try {
      return await operation(usedAccessToken);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }

      const freshAccessToken = await this.refreshAccessToken(usedAccessToken);
      return operation(freshAccessToken);
    }
  }

  private async refreshAccessToken(failedAccessToken: string): Promise<string> {
    // If another request already rotated the token while ours was in flight, reuse it.
    if (
      this.cachedTokens &&
      this.cachedTokens.accessToken !== failedAccessToken
    ) {
      return this.cachedTokens.accessToken;
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = (async () => {
      try {
        const current = await this.ensureTokens();
        const response = await this.client.refreshToken(current.refreshToken);
        const updated: AuthTokens = {
          accessToken: response.payload.accessToken,
          refreshToken: current.refreshToken,
        };
        this.cachedTokens = updated;
        await this.store.saveTokens(updated);
        return updated.accessToken;
      } catch (refreshError) {
        this.cachedTokens = null;
        await this.store.clearTokens();
        this.onSessionExpired?.();
        throw refreshError;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }
}

