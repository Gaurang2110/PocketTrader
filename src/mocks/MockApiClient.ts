import { ApiError } from '../api/interfaces';
import type { ApiClient } from '../api/interfaces';
import type {
  AccountInfo,
  ApiEnvelope,
  AuthTokens,
  LoginRequest,
  SymbolItem,
  TradeRequest,
  TradeResult,
} from '../types/market';
import {
  ACCESS_TOKEN_TTL_MS,
  DEMO_PASSWORD,
  INITIAL_ACCOUNT,
  ORDER_REJECTED,
  SEED_PRICES,
  SYMBOLS,
  TOKEN_EXPIRED,
} from './data';

export interface MockApiOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
  orderDelayMs?: number;
  tokenTtlMs?: number;
  now?: () => number;
  random?: () => number;
  getLivePrice?: (symbol: string) => { bid: number; ask: number } | undefined;
}

const ACCESS_PREFIX = 'mock-access';
const REFRESH_PREFIX = 'mock-refresh';

function wait(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class MockApiClient implements ApiClient {
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly orderDelayMs: number;
  private readonly tokenTtlMs: number;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly getLivePrice?: (symbol: string) => { bid: number; ask: number } | undefined;

  private tokenSeq = 0;
  private ticketSeq = 100420;
  private tradeCount = 0;
  private account: AccountInfo = { ...INITIAL_ACCOUNT };
  private invalidatedTokens = new Set<string>();
  private invalidatedRefreshTokens = new Set<string>();

  // Diagnostic counters useful for verifying single-flight refresh in tests and debug UI
  public refreshCallCount = 0;
  public protectedCallCount = 0;

  constructor(options: MockApiOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? 200;
    this.maxDelayMs = options.maxDelayMs ?? 800;
    this.orderDelayMs = options.orderDelayMs ?? 1000;
    this.tokenTtlMs = options.tokenTtlMs ?? ACCESS_TOKEN_TTL_MS;
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? (() => Math.random());
    this.getLivePrice = options.getLivePrice;
  }

  private randomDelay(): number {
    const span = Math.max(0, this.maxDelayMs - this.minDelayMs);
    return Math.round(this.minDelayMs + this.random() * span);
  }

  private createAccessToken(): string {
    this.tokenSeq += 1;
    const expiresAt = this.now() + this.tokenTtlMs;
    return `${ACCESS_PREFIX}-${this.tokenSeq}-${expiresAt}`;
  }

  private createRefreshToken(): string {
    this.tokenSeq += 1;
    return `${REFRESH_PREFIX}-${this.tokenSeq}`;
  }

  private assertAccessToken(token: string): void {
    if (!token || this.invalidatedTokens.has(token)) {
      throw new ApiError(TOKEN_EXPIRED.message, 401, TOKEN_EXPIRED);
    }

    const parts = token.split('-');
    // Expected shape: mock-access-<seq>-<expiresAt>
    if (parts.length !== 4 || `${parts[0]}-${parts[1]}` !== ACCESS_PREFIX) {
      throw new ApiError(TOKEN_EXPIRED.message, 401, TOKEN_EXPIRED);
    }

    const expiresAt = Number(parts[3]);
    if (!Number.isFinite(expiresAt) || this.now() >= expiresAt) {
      throw new ApiError(TOKEN_EXPIRED.message, 401, TOKEN_EXPIRED);
    }
  }

  public expireToken(accessToken: string): void {
    if (accessToken) {
      this.invalidatedTokens.add(accessToken);
    }
  }

  public invalidateRefreshToken(refreshToken: string): void {
    if (refreshToken) {
      this.invalidatedRefreshTokens.add(refreshToken);
    }
  }

  async login(body: LoginRequest): Promise<ApiEnvelope<AuthTokens>> {
    await wait(this.randomDelay());

    const email = body.email.trim();
    if (!email || !email.includes('@')) {
      throw new ApiError('Please enter a valid email address', 400, {
        success: false,
        message: 'Please enter a valid email address',
        payload: null,
      });
    }

    if (body.password !== DEMO_PASSWORD) {
      throw new ApiError('Invalid email or password', 401, {
        success: false,
        message: 'Invalid email or password',
        payload: null,
      });
    }

    return {
      success: true,
      message: 'Login successful',
      payload: {
        accessToken: this.createAccessToken(),
        refreshToken: this.createRefreshToken(),
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<ApiEnvelope<{ accessToken: string }>> {
    this.refreshCallCount += 1;
    await wait(this.randomDelay());

    if (
      !refreshToken ||
      !refreshToken.startsWith(`${REFRESH_PREFIX}-`) ||
      this.invalidatedRefreshTokens.has(refreshToken)
    ) {
      throw new ApiError('Refresh token expired', 401, {
        success: false,
        message: 'Refresh token expired',
        payload: null,
      });
    }

    return {
      success: true,
      message: 'Token refreshed',
      payload: {
        accessToken: this.createAccessToken(),
      },
    };
  }

  async getAccount(accessToken: string): Promise<ApiEnvelope<AccountInfo>> {
    this.protectedCallCount += 1;
    await wait(this.randomDelay());
    this.assertAccessToken(accessToken);

    return {
      success: true,
      message: 'Account loaded',
      payload: { ...this.account },
    };
  }

  async getSymbols(accessToken: string): Promise<ApiEnvelope<SymbolItem[]>> {
    this.protectedCallCount += 1;
    await wait(this.randomDelay());
    this.assertAccessToken(accessToken);

    return {
      success: true,
      message: 'Symbols loaded',
      payload: SYMBOLS.map(item => ({ ...item })),
    };
  }

  async placeTrade(
    accessToken: string,
    body: TradeRequest,
  ): Promise<ApiEnvelope<TradeResult>> {
    this.protectedCallCount += 1;
    await wait(this.orderDelayMs);
    this.assertAccessToken(accessToken);

    this.tradeCount += 1;
    // Fail 1 in 5 calls as specified in the brief.
    if (this.tradeCount % 5 === 0) {
      throw new ApiError(ORDER_REJECTED.message, 409, ORDER_REJECTED);
    }

    const symbolMeta = SYMBOLS.find(s => s.symbol === body.symbol);
    const digits = symbolMeta?.digits ?? 5;
    const live = this.getLivePrice?.(body.symbol);
    const seed = SEED_PRICES.find(s => s.symbol === body.symbol);

    const baseBid = live?.bid ?? seed?.bid ?? 1;
    const baseAsk = live?.ask ?? (seed ? seed.bid + seed.spread : 1);
    const rawOpenPrice = body.side === 'buy' ? baseAsk : baseBid;
    const openPrice = Number(rawOpenPrice.toFixed(digits));

    // Reflect a small realistic commission/spread impact so the refreshed AccountBar updates visibly.
    const estimatedCost = Number((body.volume * 3.5).toFixed(2));
    this.account = {
      ...this.account,
      balance: Number((this.account.balance - estimatedCost).toFixed(2)),
      equity: Number((this.account.equity - estimatedCost * 1.2).toFixed(2)),
    };

    this.ticketSeq += 1;

    return {
      success: true,
      message: 'Order executed',
      payload: {
        ticket: this.ticketSeq,
        openPrice,
        openTime: Math.floor(this.now() / 1000),
      },
    };
  }
}

