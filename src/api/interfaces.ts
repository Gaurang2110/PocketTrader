import type {
  AccountInfo,
  ApiEnvelope,
  AuthTokens,
  LoginRequest,
  PriceTick,
  SymbolItem,
  TradeRequest,
  TradeResult,
} from '../types/market';

export class ApiError extends Error {
  readonly status: number;
  readonly envelope?: ApiEnvelope<unknown>;

  constructor(message: string, status: number, envelope?: ApiEnvelope<unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.envelope = envelope;
  }
}

export interface ApiClient {
  login(body: LoginRequest): Promise<ApiEnvelope<AuthTokens>>;
  refreshToken(refreshToken: string): Promise<ApiEnvelope<{ accessToken: string }>>;
  getAccount(accessToken: string): Promise<ApiEnvelope<AccountInfo>>;
  getSymbols(accessToken: string): Promise<ApiEnvelope<SymbolItem[]>>;
  placeTrade(accessToken: string, body: TradeRequest): Promise<ApiEnvelope<TradeResult>>;
}

export type TickHandler = (ticks: PriceTick[]) => void;

export interface PriceFeed {
  connect(): void;
  disconnect(): void;
  subscribe(symbols: string[], onTicks: TickHandler): () => void;
}

