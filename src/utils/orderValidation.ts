import type { OrderSide, PriceTick } from '../types/market';

export const MIN_VOLUME = 0.01;
export const MAX_VOLUME = 100;
export const VOLUME_STEP = 0.01;

export type ValidationErrorKey =
  | 'noLiveQuote'
  | 'invalidVolume'
  | 'invalidStopLossNumber'
  | 'stopLossBuyTooHigh'
  | 'stopLossSellTooLow';

export interface StopLossValidationResult {
  valid: boolean;
  value?: number;
  errorKey?: ValidationErrorKey;
}

export interface OrderValidationResult {
  valid: boolean;
  volume?: number;
  stopLoss?: number;
  errorKey?: ValidationErrorKey;
}

export function roundVolume(volume: number): number {
  return Math.round(volume * 100) / 100;
}

export function stepVolume(current: number, deltaSteps: number): number {
  const currentUnits = Math.round(current * 100);
  const nextUnits = currentUnits + deltaSteps;
  const clamped = Math.min(10_000, Math.max(1, nextUnits));
  return clamped / 100;
}

export function isValidVolume(volume: number): boolean {
  if (!Number.isFinite(volume)) {
    return false;
  }
  if (volume < MIN_VOLUME || volume > MAX_VOLUME) {
    return false;
  }
  const hundredths = volume * 100;
  return Math.abs(hundredths - Math.round(hundredths)) < 1e-6;
}

export function validateStopLoss(
  rawStopLoss: string,
  side: OrderSide,
  liveTick: Pick<PriceTick, 'bid' | 'ask'> | null | undefined,
): StopLossValidationResult {
  const trimmed = rawStopLoss.trim();
  if (trimmed === '') {
    return { valid: true, value: undefined };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { valid: false, errorKey: 'invalidStopLossNumber' };
  }

  if (!liveTick) {
    return { valid: false, errorKey: 'noLiveQuote' };
  }

  if (side === 'buy' && parsed >= liveTick.bid) {
    return { valid: false, errorKey: 'stopLossBuyTooHigh' };
  }

  if (side === 'sell' && parsed <= liveTick.ask) {
    return { valid: false, errorKey: 'stopLossSellTooLow' };
  }

  return { valid: true, value: parsed };
}

export function validateOrder(params: {
  rawVolume: string;
  rawStopLoss: string;
  side: OrderSide;
  liveTick: Pick<PriceTick, 'bid' | 'ask'> | null | undefined;
}): OrderValidationResult {
  if (!params.liveTick) {
    return { valid: false, errorKey: 'noLiveQuote' };
  }

  const parsedVolume = Number(params.rawVolume.trim());
  if (!isValidVolume(parsedVolume)) {
    return { valid: false, errorKey: 'invalidVolume' };
  }

  const slCheck = validateStopLoss(
    params.rawStopLoss,
    params.side,
    params.liveTick,
  );
  if (!slCheck.valid) {
    return { valid: false, errorKey: slCheck.errorKey };
  }

  return {
    valid: true,
    volume: roundVolume(parsedVolume),
    stopLoss: slCheck.value,
  };
}

