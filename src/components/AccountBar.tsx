import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  authClient,
  debugExpireCurrentToken,
  getMockDiagnostics,
} from '../api/clientProvider';
import { fetchAccount } from '../store/accountSlice';
import { signOut } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store';
import { formatMoney } from '../utils/formatting';

export function AccountBar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { info, loading } = useAppSelector(state => state.account);

  const [burstBusy, setBurstBusy] = useState(false);
  const [burstNotice, setBurstNotice] = useState<string | null>(null);

  const handleLogout = () => {
    dispatch(signOut());
  };

  const handleExpireToken = () => {
    debugExpireCurrentToken();
  };

  const handleBurst = async () => {
    if (burstBusy) {
      return;
    }
    setBurstBusy(true);
    setBurstNotice(null);
    try {
      // Fires 3 authenticated calls simultaneously to exercise single-flight 401 refresh.
      await Promise.all([
        authClient.getAccount(),
        authClient.getSymbols(),
        authClient.getAccount(),
      ]);
      const { refreshCalls } = getMockDiagnostics();
      setBurstNotice(t('accountBar.burstSuccess', { refreshes: refreshCalls }));
      dispatch(fetchAccount());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.error');
      setBurstNotice(t('accountBar.burstFailed', { message }));
    } finally {
      setBurstBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.metricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>{t('accountBar.balance')}</Text>
            <Text style={styles.metricValue}>
              {info
                ? formatMoney(info.balance, info.currency)
                : t('common.loading')}
            </Text>
          </View>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>{t('accountBar.equity')}</Text>
            <Text style={styles.metricValue}>
              {info
                ? formatMoney(info.equity, info.currency)
                : t('common.loading')}
            </Text>
          </View>
          {loading && <ActivityIndicator size="small" color="#2563EB" />}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          accessibilityRole="button"
        >
          <Text style={styles.logoutText}>{t('accountBar.logout')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debugRow}>
        <Text style={styles.accountId}>
          {info ? t('accountBar.accountLabel', { login: info.login }) : ''}
        </Text>
        <View style={styles.debugActions}>
          <TouchableOpacity
            onPress={handleExpireToken}
            style={styles.debugButton}
            accessibilityRole="button"
          >
            <Text style={styles.debugButtonText}>
              {t('accountBar.expireToken')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBurst}
            disabled={burstBusy}
            style={[styles.debugButton, styles.burstButton]}
            accessibilityRole="button"
          >
            {burstBusy ? (
              <ActivityIndicator size="small" color="#1D4ED8" />
            ) : (
              <Text style={styles.burstButtonText}>
                {t('accountBar.burst')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {burstNotice ? (
        <Text style={styles.burstNotice}>{burstNotice}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flex: 1,
  },
  metricBlock: {
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  debugRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountId: {
    fontSize: 11,
    color: '#64748B',
  },
  debugActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
  debugButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  burstButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    minWidth: 72,
    alignItems: 'center',
  },
  burstButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  burstNotice: {
    marginTop: 6,
    fontSize: 11,
    color: '#0F766E',
  },
});

