import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { authApi } from '../api/auth';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

export default function MyQRCodeScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const res = await authApi.generateQRToken();
      setToken(`novelgen://login/${res.data.token}`);
    } catch (e) {
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={XColors.primary} />
        <Text style={styles.hint}>Generating your QR code...</Text>
      </View>
    );
  }

  if (error || !token) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Something went wrong'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My QR Code</Text>
      <Text style={styles.subtitle}>Let others scan this to log in as you</Text>

      <View style={styles.qrContainer}>
        <QRCode value={token} size={220} color="#0f1419" backgroundColor="#ffffff" />
      </View>

      <Text style={styles.hint}>This code refreshes every 5 minutes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: XColors.background,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: XSpacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: XColors.background,
  },
  title: {
    ...XTypography.headlineLarge,
    color: XColors.textPrimary,
    marginBottom: XSpacing.sm,
  },
  subtitle: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    textAlign: 'center',
    marginBottom: XSpacing.xxl,
  },
  qrContainer: {
    padding: XSpacing.xl,
    backgroundColor: '#ffffff',
    borderRadius: XBorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  hint: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: XSpacing.xl,
    textAlign: 'center',
  },
  error: {
    ...XTypography.bodyMedium,
    color: XColors.error,
  },
});
