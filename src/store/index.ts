import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { authClient, priceFeed } from '../api/clientProvider';
import { PriceStreamService } from '../services/priceStream';
import accountReducer from './accountSlice';
import authReducer, { sessionExpired } from './authSlice';
import pricesReducer, { batchTicksReceived } from './pricesSlice';
import symbolsReducer from './symbolsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    account: accountReducer,
    symbols: symbolsReducer,
    prices: pricesReducer,
  },
  // High-frequency 200ms price batches trigger slow dev-only deep-traversal warnings on emulators.
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
});

authClient.setSessionExpiredHandler(() => {
  store.dispatch(sessionExpired());
});

export const priceStream = new PriceStreamService(
  priceFeed,
  ticks => {
    store.dispatch(batchTicksReceived(ticks));
  },
  200,
);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

