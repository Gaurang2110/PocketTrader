import * as Keychain from 'react-native-keychain';
import type { AuthTokens } from '../types/market';

export interface TokenStore {
  getTokens(): Promise<AuthTokens | null>;
  saveTokens(tokens: AuthTokens): Promise<void>;
  clearTokens(): Promise<void>;
}

const KEYCHAIN_SERVICE = 'com.pockettrader.auth';
const KEYCHAIN_ACCOUNT = 'session';

export class KeychainTokenStore implements TokenStore {
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
      });
      if (!credentials) {
        return null;
      }
      const parsed = JSON.parse(credentials.password) as Partial<AuthTokens>;
      if (
        typeof parsed.accessToken === 'string' &&
        typeof parsed.refreshToken === 'string'
      ) {
        return {
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async saveTokens(tokens: AuthTokens): Promise<void> {
    await Keychain.setGenericPassword(
      KEYCHAIN_ACCOUNT,
      JSON.stringify(tokens),
      {
        service: KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      },
    );
  }

  async clearTokens(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
  }
}

export const tokenStore: TokenStore = new KeychainTokenStore();

