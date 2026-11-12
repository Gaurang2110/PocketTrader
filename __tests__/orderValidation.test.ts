import {
  stepVolume,
  validateOrder,
  validateStopLoss,
} from '../src/utils/orderValidation';

describe('stop-loss and order validation', () => {
  const quote = { bid: 1.0842, ask: 1.08435 };

  test('allows empty stop loss since it is optional', () => {
    expect(validateStopLoss('', 'buy', quote)).toEqual({
      valid: true,
      value: undefined,
    });
    expect(validateStopLoss('   ', 'sell', quote)).toEqual({
      valid: true,
      value: undefined,
    });
  });

  test('Buy stop loss must be strictly below live bid', () => {
    expect(validateStopLoss('1.0830', 'buy', quote)).toEqual({
      valid: true,
      value: 1.083,
    });
    expect(validateStopLoss('1.0842', 'buy', quote)).toEqual({
      valid: false,
      errorKey: 'stopLossBuyTooHigh',
    });
    expect(validateStopLoss('1.0850', 'buy', quote)).toEqual({
      valid: false,
      errorKey: 'stopLossBuyTooHigh',
    });
  });

  test('Sell stop loss must be strictly above live ask', () => {
    expect(validateStopLoss('1.0855', 'sell', quote)).toEqual({
      valid: true,
      value: 1.0855,
    });
    expect(validateStopLoss('1.08435', 'sell', quote)).toEqual({
      valid: false,
      errorKey: 'stopLossSellTooLow',
    });
    expect(validateStopLoss('1.0840', 'sell', quote)).toEqual({
      valid: false,
      errorKey: 'stopLossSellTooLow',
    });
  });

  test('rejects zero, negative, or non-numeric stop loss', () => {
    expect(validateStopLoss('0', 'buy', quote).errorKey).toBe(
      'invalidStopLossNumber',
    );
    expect(validateStopLoss('-1.05', 'sell', quote).errorKey).toBe(
      'invalidStopLossNumber',
    );
    expect(validateStopLoss('abc', 'buy', quote).errorKey).toBe(
      'invalidStopLossNumber',
    );
  });

  test('validates stop loss against latest price when market moves', () => {
    const oldQuote = { bid: 1.085, ask: 1.08515 };
    const latestQuote = { bid: 1.0839, ask: 1.08405 };

    // 1.0845 was valid when bid was 1.0850, but becomes invalid once bid drops to 1.0839.
    expect(
      validateOrder({
        rawVolume: '0.25',
        rawStopLoss: '1.0845',
        side: 'buy',
        liveTick: oldQuote,
      }).valid,
    ).toBe(true);

    expect(
      validateOrder({
        rawVolume: '0.25',
        rawStopLoss: '1.0845',
        side: 'buy',
        liveTick: latestQuote,
      }),
    ).toEqual({
      valid: false,
      errorKey: 'stopLossBuyTooHigh',
    });
  });

  test('validates volume boundaries (0.01 - 100 lots, step 0.01)', () => {
    expect(
      validateOrder({
        rawVolume: '0.01',
        rawStopLoss: '',
        side: 'buy',
        liveTick: quote,
      }),
    ).toEqual({ valid: true, volume: 0.01, stopLoss: undefined });

    expect(
      validateOrder({
        rawVolume: '100',
        rawStopLoss: '',
        side: 'sell',
        liveTick: quote,
      }),
    ).toEqual({ valid: true, volume: 100, stopLoss: undefined });

    expect(
      validateOrder({
        rawVolume: '0.005',
        rawStopLoss: '',
        side: 'buy',
        liveTick: quote,
      }).errorKey,
    ).toBe('invalidVolume');

    expect(
      validateOrder({
        rawVolume: '100.01',
        rawStopLoss: '',
        side: 'buy',
        liveTick: quote,
      }).errorKey,
    ).toBe('invalidVolume');

    expect(stepVolume(0.1, 2)).toBe(0.12);
    expect(stepVolume(0.01, -1)).toBe(0.01);
    expect(stepVolume(100, 1)).toBe(100);
  });
});

