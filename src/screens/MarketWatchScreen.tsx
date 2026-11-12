import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountBar } from '../components/AccountBar';
import { SymbolRow } from '../components/SymbolRow';
import { fetchSymbols } from '../store/symbolsSlice';
import { priceStream, useAppDispatch, useAppSelector } from '../store';
import type { SymbolItem } from '../types/market';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MarketWatch'>;

export function MarketWatchScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const { items: symbols, loading, error } = useAppSelector(
    state => state.symbols,
  );

  const [query, setQuery] = useState('');

  const filteredSymbols = useMemo(() => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) {
      return symbols;
    }
    return symbols.filter(item =>
      item.symbol.toUpperCase().includes(trimmed),
    );
  }, [symbols, query]);

  const subscriptionKey = useMemo(() => {
    if (!isFocused || filteredSymbols.length === 0) {
      return '';
    }
    return filteredSymbols.map(s => s.symbol).join(',');
  }, [isFocused, filteredSymbols]);

  useEffect(() => {
    if (!subscriptionKey) {
      return;
    }
    return priceStream.acquire(subscriptionKey.split(','));
  }, [subscriptionKey]);

  const handlePressSymbol = useCallback(
    (item: SymbolItem) => {
      navigation.navigate('PlaceOrder', item);
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: SymbolItem }) => (
      <SymbolRow item={item} onPress={handlePressSymbol} />
    ),
    [handlePressSymbol],
  );

  const keyExtractor = useCallback((item: SymbolItem) => item.symbol, []);

  return (
    <View style={styles.container}>
      <AccountBar />

      <View style={styles.searchContainer}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('marketWatch.searchPlaceholder')}
          placeholderTextColor="#94A3B8"
          autoCapitalize="characters"
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={styles.searchInput}
        />
        <Text style={styles.countText}>
          {t('marketWatch.symbolCount', { count: filteredSymbols.length })}
        </Text>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.symbolHeader]}>
          {t('marketWatch.title')}
        </Text>
        <View style={styles.headerMetrics}>
          <Text style={[styles.headerText, styles.metricCol]}>
            {t('marketWatch.bid')}
          </Text>
          <Text style={[styles.headerText, styles.metricCol]}>
            {t('marketWatch.ask')}
          </Text>
          <Text style={[styles.headerText, styles.spreadCol]}>
            {t('marketWatch.spread')}
          </Text>
        </View>
      </View>

      {loading && symbols.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text style={styles.stateText}>{t('marketWatch.loadingSymbols')}</Text>
        </View>
      ) : error && symbols.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => dispatch(fetchSymbols())}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSymbols}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateText}>
                {t('marketWatch.emptySearch', { query })}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    flexGrow: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  countText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  symbolHeader: {
    flex: 1.3,
  },
  headerMetrics: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  metricCol: {
    flex: 1,
    textAlign: 'right',
  },
  spreadCol: {
    width: 52,
    textAlign: 'right',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
