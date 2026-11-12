import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authClient } from '../api/clientProvider';
import { ApiError } from '../api/interfaces';
import type { LoginRequest } from '../types/market';

export type AuthStatus = 'checking' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: AuthState = {
  status: 'checking',
  isSubmitting: false,
  error: null,
};

export const hydrateSession = createAsyncThunk(
  'auth/hydrateSession',
  async () => {
    const tokens = await authClient.restoreTokens();
    return tokens !== null;
  },
);

export const signIn = createAsyncThunk<void, LoginRequest, { rejectValue: string }>(
  'auth/signIn',
  async (credentials, { rejectWithValue }) => {
    try {
      await authClient.login(credentials);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Login failed';
      return rejectWithValue(message);
    }
  },
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await authClient.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired(state) {
      state.status = 'signedOut';
      state.isSubmitting = false;
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(hydrateSession.fulfilled, (state, action) => {
        state.status = action.payload ? 'signedIn' : 'signedOut';
      })
      .addCase(hydrateSession.rejected, state => {
        state.status = 'signedOut';
      })
      .addCase(signIn.pending, state => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, state => {
        state.isSubmitting = false;
        state.status = 'signedIn';
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload ?? 'Login failed';
      })
      .addCase(signOut.fulfilled, state => {
        state.status = 'signedOut';
        state.isSubmitting = false;
        state.error = null;
      });
  },
});

export const { sessionExpired, clearAuthError } = authSlice.actions;
export default authSlice.reducer;

