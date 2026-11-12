import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authClient } from '../api/clientProvider';
import { ApiError } from '../api/interfaces';
import type { AccountInfo } from '../types/market';
import { sessionExpired, signOut } from './authSlice';

interface AccountState {
  info: AccountInfo | null;
  loading: boolean;
  error: string | null;
}

const initialState: AccountState = {
  info: null,
  loading: false,
  error: null,
};

export const fetchAccount = createAsyncThunk<
  AccountInfo,
  void,
  { rejectValue: string }
>('account/fetchAccount', async (_, { rejectWithValue }) => {
  try {
    const res = await authClient.getAccount();
    return res.payload;
  } catch (error) {
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Unable to load account';
    return rejectWithValue(message);
  }
});

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchAccount.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.info = action.payload;
      })
      .addCase(fetchAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unable to load account';
      })
      .addCase(signOut.fulfilled, state => {
        state.info = null;
        state.loading = false;
        state.error = null;
      })
      .addCase(sessionExpired, state => {
        state.info = null;
        state.loading = false;
        state.error = null;
      });
  },
});

export default accountSlice.reducer;

