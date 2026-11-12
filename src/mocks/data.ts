export type Envelope<T> = {
  success: boolean;
  message: string;
  payload: T;
};

export type SymbolInfo = {
  symbol: string;
  description: string;
  digits: number; // decimal places for display and rounding
};

// Starting price for the random walk.
// ask = bid + spread. On each tick, move bid by a random amount within ±spread.
export type SeedPrice = {
  symbol: string;
  bid: number;
  spread: number;
};

export const SYMBOLS: SymbolInfo[] = [
  { symbol: 'EURUSD', description: 'Euro vs US Dollar', digits: 5 },
  { symbol: 'GBPUSD', description: 'British Pound vs US Dollar', digits: 5 },
  { symbol: 'USDJPY', description: 'US Dollar vs Japanese Yen', digits: 3 },
  { symbol: 'USDCHF', description: 'US Dollar vs Swiss Franc', digits: 5 },
  { symbol: 'AUDUSD', description: 'Australian Dollar vs US Dollar', digits: 5 },
  { symbol: 'USDCAD', description: 'US Dollar vs Canadian Dollar', digits: 5 },
  { symbol: 'NZDUSD', description: 'New Zealand Dollar vs US Dollar', digits: 5 },
  { symbol: 'EURGBP', description: 'Euro vs British Pound', digits: 5 },
  { symbol: 'EURJPY', description: 'Euro vs Japanese Yen', digits: 3 },
  { symbol: 'GBPJPY', description: 'British Pound vs Japanese Yen', digits: 3 },
  { symbol: 'EURCHF', description: 'Euro vs Swiss Franc', digits: 5 },
  { symbol: 'AUDJPY', description: 'Australian Dollar vs Japanese Yen', digits: 3 },
  { symbol: 'EURAUD', description: 'Euro vs Australian Dollar', digits: 5 },
  { symbol: 'EURCAD', description: 'Euro vs Canadian Dollar', digits: 5 },
  { symbol: 'GBPCHF', description: 'British Pound vs Swiss Franc', digits: 5 },
  { symbol: 'CADJPY', description: 'Canadian Dollar vs Japanese Yen', digits: 3 },
  { symbol: 'USDSGD', description: 'US Dollar vs Singapore Dollar', digits: 5 },
  { symbol: 'USDHKD', description: 'US Dollar vs Hong Kong Dollar', digits: 5 },
  { symbol: 'USDCNH', description: 'US Dollar vs Chinese Yuan (offshore)', digits: 5 },
  { symbol: 'USDTRY', description: 'US Dollar vs Turkish Lira', digits: 4 },
  { symbol: 'XAUUSD', description: 'Gold vs US Dollar', digits: 2 },
  { symbol: 'XAGUSD', description: 'Silver vs US Dollar', digits: 3 },
  { symbol: 'XPTUSD', description: 'Platinum vs US Dollar', digits: 2 },
  { symbol: 'USOIL', description: 'WTI Crude Oil', digits: 2 },
  { symbol: 'US30', description: 'Dow Jones 30 Index', digits: 1 },
  { symbol: 'US500', description: 'S&P 500 Index', digits: 2 },
  { symbol: 'NAS100', description: 'Nasdaq 100 Index', digits: 2 },
  { symbol: 'GER40', description: 'Germany 40 Index', digits: 1 },
  { symbol: 'UK100', description: 'UK 100 Index', digits: 1 },
  { symbol: 'JPN225', description: 'Japan 225 Index', digits: 0 },
];

export const SEED_PRICES: SeedPrice[] = [
  { symbol: 'EURUSD', bid: 1.0842, spread: 0.00012 },
  { symbol: 'GBPUSD', bid: 1.2715, spread: 0.00015 },
  { symbol: 'USDJPY', bid: 151.42, spread: 0.012 },
  { symbol: 'USDCHF', bid: 0.8821, spread: 0.00015 },
  { symbol: 'AUDUSD', bid: 0.6573, spread: 0.00012 },
  { symbol: 'USDCAD', bid: 1.3654, spread: 0.00018 },
  { symbol: 'NZDUSD', bid: 0.5988, spread: 0.00018 },
  { symbol: 'EURGBP', bid: 0.8527, spread: 0.00015 },
  { symbol: 'EURJPY', bid: 164.17, spread: 0.018 },
  { symbol: 'GBPJPY', bid: 192.53, spread: 0.025 },
  { symbol: 'EURCHF', bid: 0.9564, spread: 0.0002 },
  { symbol: 'AUDJPY', bid: 99.53, spread: 0.02 },
  { symbol: 'EURAUD', bid: 1.6495, spread: 0.00025 },
  { symbol: 'EURCAD', bid: 1.4804, spread: 0.00025 },
  { symbol: 'GBPCHF', bid: 1.1216, spread: 0.00028 },
  { symbol: 'CADJPY', bid: 110.9, spread: 0.022 },
  { symbol: 'USDSGD', bid: 1.3421, spread: 0.0003 },
  { symbol: 'USDHKD', bid: 7.8145, spread: 0.0006 },
  { symbol: 'USDCNH', bid: 7.2431, spread: 0.0008 },
  { symbol: 'USDTRY', bid: 34.215, spread: 0.015 },
  { symbol: 'XAUUSD', bid: 2650.45, spread: 0.25 },
  { symbol: 'XAGUSD', bid: 31.245, spread: 0.03 },
  { symbol: 'XPTUSD', bid: 975.3, spread: 1.5 },
  { symbol: 'USOIL', bid: 71.45, spread: 0.03 },
  { symbol: 'US30', bid: 43250.0, spread: 2.0 },
  { symbol: 'US500', bid: 5920.5, spread: 0.5 },
  { symbol: 'NAS100', bid: 20750.0, spread: 1.5 },
  { symbol: 'GER40', bid: 19320.0, spread: 1.5 },
  { symbol: 'UK100', bid: 8150.0, spread: 1.0 },
  { symbol: 'JPN225', bid: 38900, spread: 8 },
];

export const DEMO_PASSWORD = 'Demo@1234';

export const INITIAL_ACCOUNT = {
  login: 50012345,
  currency: 'USD',
  balance: 10000,
  equity: 10000,
};

export const ACCESS_TOKEN_TTL_MS = 60_000;

export const LOGIN_SUCCESS: Envelope<{ accessToken: string; refreshToken: string }> = {
  success: true,
  message: 'Login successful',
  payload: { accessToken: 'mock-access-1', refreshToken: 'mock-refresh-1' },
};

export const TOKEN_EXPIRED: Envelope<null> = {
  success: false,
  message: 'Access token expired',
  payload: null,
};

export const ORDER_REJECTED: Envelope<null> = {
  success: false,
  message: 'Order rejected: price changed, please try again',
  payload: null,
};

