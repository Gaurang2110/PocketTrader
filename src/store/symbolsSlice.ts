import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authClient } from '../api/clientProvider';
import { ApiError } from '../api/interfaces';
import type { SymbolItem } from '../types/market';
import { sessionExpired, signOut } from './authSlice';

interface SymbolsState {
  items: SymbolItem[];
  loading: boolean;
  error: string | null;
}

const initialState: SymbolsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchSymbols = createAsyncThunk<
  SymbolItem[],
  void,
  { rejectValue: string }
>('symbols/fetchSymbols', async (_, { rejectWithValue }) => {
  try {
    const res = await authClient.getSymbols();
    return res.payload;
  } catch (error) {
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Unable to load symbols';
    return rejectWithValue(message);
  }
});

const symbolsSlice = createSlice({
  name: 'symbols',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchSymbols.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSymbols.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSymbols.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unable to load symbols';
      })
      .addCase(signOut.fulfilled, state => {
        state.items = [];
        state.loading = false;
        state.error = null;
      })
      .addCase(sessionExpired, state => {
        state.items = [];
        state.loading = false;
        state.error = null;
      });
  },
});

export default symbolsSlice.reducer;

