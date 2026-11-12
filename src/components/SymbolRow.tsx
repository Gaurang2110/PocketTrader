import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppSelector } from '../store';
import type { SymbolItem } from '../types/market';
import { formatPrice } from '../utils/formatting';

interface SymbolRowProps {
  item: SymbolItem;
  onPress: (item: SymbolItem) => void;
}

function SymbolRowInner({ item, onPress }: SymbolRowProps) {
  const quote = useAppSelector(state => state.prices.bySymbol[item.symbol]);

  const flashOpacity = useRef(new Animated.Value(0)).current;
  const lastSeqRef = useRef<number>(0);

  useEffect(() => {
    if (!quote || quote.tickSeq === lastSeqRef.current) {
      return;
    }
    const isInitial = lastSeqRef.current === 0;
    lastSeqRef.current = quote.tickSeq;

    if (isInitial || quote.direction === 'flat') {
      return;
    }

    flashOpacity.setValue(0.18);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [quote, flashOpacity]);

  const priceColor =
    quote?.direction === 'up'
      ? styles.priceUp
      : quote?.direction === 'down'
      ? styles.priceDown
      : styles.priceNeutral;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          quote?.direction === 'down' ? styles.flashDown : styles.flashUp,
          { opacity: flashOpacity },
        ]}
      />
      <View style={styles.leftColumn}>
        <Text style={styles.symbolText}>{item.symbol}</Text>
        <Text style={styles.descriptionText} numberOfLines={1}>
          {item.description}
        </Text>
      </View>

      <View style={styles.rightColumns}>
        <View style={styles.priceCell}>
          <Text style={[styles.priceText, priceColor]}>
            {quote ? formatPrice(quote.bid, item.digits) : '--'}
          </Text>
        </View>
        <View style={styles.priceCell}>
          <Text style={[styles.priceText, priceColor]}>
            {quote ? formatPrice(quote.ask, item.digits) : '--'}
          </Text>
        </View>
        <View style={styles.spreadCell}>
          <Text style={styles.spreadText}>
            {quote ? quote.spread.toFixed(1) : '--'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const SymbolRow = React.memo(SymbolRowInner);

const styles = StyleSheet.create({
  flashUp: {
    backgroundColor: '#16A34A',
  },
  flashDown: {
    backgroundColor: '#DC2626',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    overflow: 'hidden',
  },
  leftColumn: {
    flex: 1.3,
    paddingRight: 8,
  },
  symbolText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  descriptionText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rightColumns: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  priceCell: {
    flex: 1,
    alignItems: 'flex-end',
  },
  spreadCell: {
    width: 52,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  priceUp: {
    color: '#15803D',
  },
  priceDown: {
    color: '#B91C1C',
  },
  priceNeutral: {
    color: '#0F172A',
  },
  spreadText: {
    fontSize: 12,
    color: '#475569',
    fontVariant: ['tabular-nums'],
  },
});
