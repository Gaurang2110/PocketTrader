export type OrderSide = 'buy' | 'sell';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AccountInfo {
  login: number;
  currency: string;
  balance: number;
  equity: number;
}

export interface SymbolItem {
  symbol: string;
  description: string;
  digits: number;
}

export interface TradeRequest {
  symbol: string;
  side: OrderSide;
  volume: number;
  sl?: number;
}

export interface TradeResult {
  ticket: number;
  openPrice: number;
  openTime: number;
}

export interface PriceTick {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  dateTime: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  payload: T;
}

