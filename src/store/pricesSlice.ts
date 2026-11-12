import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { PriceTick } from '../types/market';
import { sessionExpired, signOut } from './authSlice';

export type PriceDirection = 'up' | 'down' | 'flat';

export interface SymbolQuote extends PriceTick {
  direction: PriceDirection;
  tickSeq: number;
}

interface PricesState {
  bySymbol: Record<string, SymbolQuote>;
}

const initialState: PricesState = {
  bySymbol: {},
};

const pricesSlice = createSlice({
  name: 'prices',
  initialState,
  reducers: {
    batchTicksReceived(state, action: PayloadAction<PriceTick[]>) {
      for (const tick of action.payload) {
        const previous = state.bySymbol[tick.symbol];
        let direction: PriceDirection = 'flat';
        if (previous) {
          if (tick.bid > previous.bid) {
            direction = 'up';
          } else if (tick.bid < previous.bid) {
            direction = 'down';
          }
        }
        state.bySymbol[tick.symbol] = {
          ...tick,
          direction,
          tickSeq: (previous?.tickSeq ?? 0) + 1,
        };
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(signOut.fulfilled, state => {
        state.bySymbol = {};
      })
      .addCase(sessionExpired, state => {
        state.bySymbol = {};
      });
  },
});

export const { batchTicksReceived } = pricesSlice.actions;
export default pricesSlice.reducer;

