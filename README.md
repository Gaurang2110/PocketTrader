# Pocket Trader

A bare **React Native CLI** (TypeScript, `strict: true`) trading client featuring secure session persistence, single-flight token refresh, high-frequency live market quotes, and market order execution with live stop-loss validation.

## Setup & Running

This project uses **bare React Native CLI** (`0.88.1`, not Expo).

### Prerequisites
- Node.js `>= 22.11` (LTS v22 recommended)
- Xcode & CocoaPods (for iOS)
- Android Studio / JDK 17 & Android SDK (for Android)

### Install dependencies
```sh
npm install
cd ios && bundle install && bundle exec pod install && cd ..
# or if using system CocoaPods:
# cd ios && pod install && cd ..
```

### Run on iOS
```sh
npm run ios
```

### Run on Android
Start an Android emulator (or connect a device via `adb`), then:
```sh
npm run android
```

### Run unit tests & checks
```sh
npm test
npx tsc --noEmit
npm run lint
```

### Demo credentials
- **Email**: any valid email (e.g. `trader@example.com`)
- **Password**: `Demo@1234`

---

## Architecture Overview

The app separates UI components, state management, and data transport behind TypeScript interfaces:

- **Interface & Mock Boundary (`src/api/` & `src/mocks/`)**: Screens and Redux slices only interact with the `ApiClient` and `PriceFeed` interfaces (`src/api/interfaces.ts`) via `src/api/clientProvider.ts`. The mock implementations (`MockApiClient` and `MockPriceFeed`) live inside `src/mocks/`, so swapping to real REST and WebSocket endpoints only requires replacing the two instances in `clientProvider.ts`.
- **Auth & Single-Flight Refresh (`src/api/authHttpClient.ts`, `src/services/tokenStorage.ts`)**: Access and refresh tokens are stored in iOS Keychain / Android Keystore using `react-native-keychain` (never `AsyncStorage`). On cold start, `hydrateSession` checks Keychain and routes straight to Market Watch when tokens exist. All authenticated requests pass through `AuthHttpClient`, which intercepts `401` responses and shares a single `refreshInFlight` promise across concurrent callers—so simultaneous failures (such as tapping **Burst (3x)**) trigger only one `POST /users/v1/refresh-token/external` call before retrying all pending requests once. If refresh fails, Keychain is cleared and the user returns to Login.
- **High-Frequency Quotes & Render Isolation (`src/services/priceStream.ts`, `src/store/pricesSlice.ts`, `src/components/SymbolRow.tsx`)**: A single shared `PriceFeed` connection is managed by `PriceStreamService` with reference-counted subscriptions per screen (`MarketWatch` subscribes only to currently visible/filtered symbols; `PlaceOrder` subscribes only to the active symbol). Incoming ~200 ticks/s bursts are deduplicated in a `Map` (keeping only the latest tick per symbol) and flushed to Redux in batches every `200 ms`. `MarketWatchScreen` and `AccountBar` do not subscribe to `state.prices`; instead, each `React.memo`-wrapped `SymbolRow` subscribes strictly to `state.prices.bySymbol[symbol]` and runs its green/red flash animation on the native UI thread via `Animated.timing` with `useNativeDriver: true`.
- **Order Execution & Validation (`src/screens/PlaceOrderScreen.tsx`, `src/utils/orderValidation.ts`)**: Volume uses integer hundredths arithmetic (`0.01–100`, step `0.01`) to avoid floating-point drift. Stop-loss rules (`sl < bid` for Buy, `sl > ask` for Sell) display live feedback while prices tick and re-validate against `store.getState().prices.bySymbol[symbol]` at the exact moment of submission so stale closure prices are never used. A synchronous ref lock + button disable prevents double submission.

---

## Library Choices

- **`@reduxjs/toolkit` + `react-redux`**: Predictable normalized state and fine-grained per-row selectors (`state.prices.bySymbol[symbol]`) that prevent 200 ms quote updates from re-rendering unrelated rows, headers, or screens.
- **`@react-navigation/native` + `@react-navigation/native-stack`**: Native stack transitions and focused screen lifecycle (`useIsFocused`) to acquire/release symbol subscriptions per screen.
- **`react-native-keychain`**: Hardware-backed credential storage on iOS Keychain and Android Keystore.
- **`i18next` + `react-i18next` + `react-native-localize`**: Clean JSON translation files (`src/i18n/locales/en.json` and `es.json`) with automatic device locale detection.

---

## Assumptions & Notes

1. **Spread units**: `SEED_PRICES` defines raw price spread (e.g. `0.00012` for `EURUSD`), while the sample tick payload shows `spread: 1.3`. `MockPriceFeed` converts raw spread to pips/points using `(ask - bid) * 10^(digits - 1)` (capped at scale `1` when `digits === 0`).
2. **Mock token TTL across cold starts**: `MockApiClient` encodes the expiry timestamp in the mock access token string (`mock-access-<seq>-<expiresAt>`) so cold-start session hydration works across app restarts without a persistent server.
3. **Visible account balance update after trade**: `MockApiClient.placeTrade` applies a small spread/commission adjustment (`volume * 3.5`) to `balance` and `equity` so the `GET /accounts/me` refresh triggered after each order visibly updates the Account Bar.
4. **Debug controls in Account Bar**: In addition to **Burst (3x)** (which fires `getAccount`, `getSymbols`, and `getAccount` simultaneously), an **Expire Token** button is included next to it so reviewers can test single-flight 401 refresh immediately without waiting the full 60 seconds.
5. **AI coding assistant usage**: Used an AI coding assistant during scaffolding, boilerplate generation (TypeScript interfaces, Redux slices, Jest test cases, and documentation drafting), while reviewing and verifying all architecture, concurrency locks, and validation logic directly.

---

## What I Would Do With More Time

- Replace `MockApiClient` and `MockPriceFeed` with real `fetch`/Axios + WebSocket clients supporting exponential-backoff reconnection and heartbeat pings.
- Move the row price-flash animation to `react-native-reanimated` worklets for even tighter frame consistency on low-end Android devices.
- Add React Native component/integration tests for Login -> Market Watch -> Place Order flows and a Detox/Maestro E2E smoke suite.
- Add SSL/TLS certificate pinning and biometric unlock gating on top of Keychain/Keystore retrieval.
