import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authClient } from '../api/clientProvider';
import { ApiError } from '../api/interfaces';
import { AccountBar } from '../components/AccountBar';
import { fetchAccount } from '../store/accountSlice';
import { priceStream, store, useAppDispatch, useAppSelector } from '../store';
import type { OrderSide, TradeResult } from '../types/market';
import type { RootStackParamList } from '../types/navigation';
import { formatPrice, formatUnixTime } from '../utils/formatting';
import {
  MAX_VOLUME,
  MIN_VOLUME,
  VOLUME_STEP,
  stepVolume,
  validateOrder,
  validateStopLoss,
} from '../utils/orderValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceOrder'>;

export function PlaceOrderScreen({ route }: Props) {
  const { symbol, description, digits } = route.params;
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const quote = useAppSelector(state => state.prices.bySymbol[symbol]);

  const [side, setSide] = useState<OrderSide>('buy');
  const [rawVolume, setRawVolume] = useState('0.10');
  const [rawStopLoss, setRawStopLoss] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<TradeResult | null>(null);

  const submitLockRef = useRef(false);

  // Subscribe only to this single symbol while Place Order is mounted.
  useEffect(() => {
    return priceStream.acquire([symbol]);
  }, [symbol]);

  const liveSlCheck = validateStopLoss(rawStopLoss, side, quote);

  const handleStepVolume = (deltaSteps: number) => {
    const parsed = Number(rawVolume.trim());
    const base = Number.isFinite(parsed) && parsed > 0 ? parsed : MIN_VOLUME;
    const next = stepVolume(base, deltaSteps);
    setRawVolume(next.toFixed(2));
    setSubmitError(null);
  };

  const formatValidationError = (
    errorKey: string,
    latestBid?: number,
    latestAsk?: number,
  ): string => {
    if (errorKey === 'stopLossBuyTooHigh' && latestBid !== undefined) {
      return t('placeOrder.errors.stopLossBuyTooHigh', {
        bid: formatPrice(latestBid, digits),
      });
    }
    if (errorKey === 'stopLossSellTooLow' && latestAsk !== undefined) {
      return t('placeOrder.errors.stopLossSellTooLow', {
        ask: formatPrice(latestAsk, digits),
      });
    }
    return t(`placeOrder.errors.${errorKey}`);
  };

  const handleSubmit = async () => {
    if (submitLockRef.current || isSubmitting) {
      return;
    }

    // Read the freshest tick directly from store state at submit time rather than closure state.
    const latestQuote = store.getState().prices.bySymbol[symbol];
    const validation = validateOrder({
      rawVolume,
      rawStopLoss,
      side,
      liveTick: latestQuote,
    });

    if (!validation.valid || !validation.volume) {
      const key = validation.errorKey ?? 'noLiveQuote';
      setSubmitError(
        formatValidationError(key, latestQuote?.bid, latestQuote?.ask),
      );
      setOrderResult(null);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setOrderResult(null);

    try {
      const response = await authClient.placeTrade({
        symbol,
        side,
        volume: validation.volume,
        sl: validation.stopLoss,
      });
      setOrderResult(response.payload);
      dispatch(fetchAccount());
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : t('common.error');
      setSubmitError(message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <AccountBar />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.quoteCard}>
            <View style={styles.symbolHeader}>
              <Text style={styles.symbolTitle}>{symbol}</Text>
              <Text style={styles.symbolDesc}>{description}</Text>
            </View>

            {quote ? (
              <View style={styles.quoteGrid}>
                <View style={styles.quoteBox}>
                  <Text style={styles.quoteLabel}>{t('placeOrder.bid')}</Text>
                  <Text
                    style={[
                      styles.quoteValue,
                      quote.direction === 'up'
                        ? styles.upText
                        : quote.direction === 'down'
                        ? styles.downText
                        : null,
                    ]}
                  >
                    {formatPrice(quote.bid, digits)}
                  </Text>
                </View>

                <View style={styles.quoteBox}>
                  <Text style={styles.quoteLabel}>{t('placeOrder.ask')}</Text>
                  <Text
                    style={[
                      styles.quoteValue,
                      quote.direction === 'up'
                        ? styles.upText
                        : quote.direction === 'down'
                        ? styles.downText
                        : null,
                    ]}
                  >
                    {formatPrice(quote.ask, digits)}
                  </Text>
                </View>

                <View style={styles.spreadBox}>
                  <Text style={styles.quoteLabel}>
                    {t('placeOrder.spread')}
                  </Text>
                  <Text style={styles.spreadValue}>
                    {quote.spread.toFixed(1)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.waitingText}>
                {t('placeOrder.waitingQuote')}
              </Text>
            )}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>{t('placeOrder.sideLabel')}</Text>
            <View style={styles.sideRow}>
              <TouchableOpacity
                style={[
                  styles.sideButton,
                  side === 'buy' && styles.buyButtonActive,
                ]}
                onPress={() => {
                  setSide('buy');
                  setSubmitError(null);
                }}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.sideButtonText,
                    side === 'buy' && styles.sideButtonTextActive,
                  ]}
                >
                  {t('placeOrder.buy')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sideButton,
                  side === 'sell' && styles.sellButtonActive,
                ]}
                onPress={() => {
                  setSide('sell');
                  setSubmitError(null);
                }}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.sideButtonText,
                    side === 'sell' && styles.sideButtonTextActive,
                  ]}
                >
                  {t('placeOrder.sell')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>{t('placeOrder.volumeLabel')}</Text>
            <View style={styles.volumeRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => handleStepVolume(-1)}
                disabled={isSubmitting}
              >
                <Text style={styles.stepperText}>-</Text>
              </TouchableOpacity>

              <TextInput
                value={rawVolume}
                onChangeText={val => {
                  setRawVolume(val);
                  setSubmitError(null);
                }}
                keyboardType="decimal-pad"
                style={styles.volumeInput}
                editable={!isSubmitting}
              />

              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => handleStepVolume(1)}
                disabled={isSubmitting}
              >
                <Text style={styles.stepperText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>
              {t('placeOrder.volumeRangeHint', {
                min: MIN_VOLUME,
                max: MAX_VOLUME,
                step: VOLUME_STEP,
              })}
            </Text>

            <Text style={[styles.fieldLabel, styles.slLabel]}>
              {t('placeOrder.stopLossLabel')}
            </Text>
            <TextInput
              value={rawStopLoss}
              onChangeText={val => {
                setRawStopLoss(val);
                setSubmitError(null);
              }}
              placeholder={t('placeOrder.stopLossPlaceholder')}
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              style={[
                styles.input,
                !liveSlCheck.valid && styles.inputInvalid,
              ]}
              editable={!isSubmitting}
            />

            {!liveSlCheck.valid && liveSlCheck.errorKey ? (
              <Text style={styles.inlineError}>
                {formatValidationError(
                  liveSlCheck.errorKey,
                  quote?.bid,
                  quote?.ask,
                )}
              </Text>
            ) : quote ? (
              <Text style={styles.hintText}>
                {side === 'buy'
                  ? t('placeOrder.stopLossBuyHint', {
                      bid: formatPrice(quote.bid, digits),
                    })
                  : t('placeOrder.stopLossSellHint', {
                      ask: formatPrice(quote.ask, digits),
                    })}
              </Text>
            ) : null}

            {submitError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            ) : null}

            {orderResult ? (
              <View style={styles.successBanner}>
                <Text style={styles.successTitle}>
                  {t('placeOrder.orderSuccessTitle')}
                </Text>
                <Text style={styles.successDetail}>
                  {t('placeOrder.ticketLabel', { ticket: orderResult.ticket })}
                </Text>
                <Text style={styles.successDetail}>
                  {t('placeOrder.openPriceLabel', {
                    price: formatPrice(orderResult.openPrice, digits),
                  })}
                </Text>
                <Text style={styles.successDetail}>
                  {t('placeOrder.openTimeLabel', {
                    time: formatUnixTime(orderResult.openTime),
                  })}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.submitButton,
                side === 'buy' ? styles.buyButtonActive : styles.sellButtonActive,
                isSubmitting && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <View style={styles.submittingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitText}>
                    {t('placeOrder.submitting')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitText}>
                  {side === 'buy'
                    ? t('placeOrder.submitBuy', { symbol })
                    : t('placeOrder.submitSell', { symbol })}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  symbolHeader: {
    marginBottom: 12,
  },
  symbolTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  symbolDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  quoteGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quoteBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
  },
  spreadBox: {
    width: 72,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    alignItems: 'flex-end',
  },
  quoteLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  quoteValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  spreadValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  upText: {
    color: '#15803D',
  },
  downText: {
    color: '#B91C1C',
  },
  waitingText: {
    fontSize: 13,
    color: '#64748B',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  sideRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  sideButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  buyButtonActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  sellButtonActive: {
    backgroundColor: '#B91C1C',
    borderColor: '#B91C1C',
  },
  sideButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  sideButtonTextActive: {
    color: '#FFFFFF',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
  },
  volumeInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  slLabel: {
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  inputInvalid: {
    borderColor: '#DC2626',
  },
  hintText: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
  },
  inlineError: {
    marginTop: 6,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  errorBanner: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  successBanner: {
    marginTop: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    gap: 3,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 2,
  },
  successDetail: {
    fontSize: 13,
    color: '#166534',
  },
  submitButton: {
    marginTop: 18,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

