import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import './i18n';
import { LoginScreen } from './screens/LoginScreen';
import { MarketWatchScreen } from './screens/MarketWatchScreen';
import { PlaceOrderScreen } from './screens/PlaceOrderScreen';
import { fetchAccount } from './store/accountSlice';
import { hydrateSession } from './store/authSlice';
import { fetchSymbols } from './store/symbolsSlice';
import { priceStream, store, useAppDispatch, useAppSelector } from './store';
import type { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector(state => state.auth.status);

  useEffect(() => {
    dispatch(hydrateSession());
  }, [dispatch]);

  useEffect(() => {
    if (authStatus !== 'signedIn') {
      priceStream.stop();
      return;
    }

    priceStream.start();
    dispatch(fetchAccount());
    dispatch(fetchSymbols());

    return () => {
      priceStream.stop();
    };
  }, [authStatus, dispatch]);

  if (authStatus === 'checking') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  if (authStatus === 'signedOut') {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MarketWatch"
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#0F172A',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="MarketWatch"
          component={MarketWatchScreen}
          options={{ title: t('marketWatch.title') }}
        />
        <Stack.Screen
          name="PlaceOrder"
          component={PlaceOrderScreen}
          options={({ route }) => ({
            title: `${t('placeOrder.title')} · ${route.params.symbol}`,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
});
