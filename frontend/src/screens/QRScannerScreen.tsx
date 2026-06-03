import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Camera, useCameraPermissions, BarCodeScanningResult } from 'expo-camera';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { authApi, initAuthHeaders } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

type QRScannerScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'QRScanner'>;
};

export default function QRScannerScreen({ navigation }: QRScannerScreenProps) {
  const { setUserId, setIsAuthenticated } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permission || !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ data }: BarCodeScanningResult) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      // Extract token from QR data
      // Supports: novelgen://login/{token} or plain token string
      let token = data.trim();
      const prefix = 'novelgen://login/';
      if (token.startsWith(prefix)) {
        token = token.slice(prefix.length);
      }

      const res = await authApi.qrLogin(token);
      await authApi.setToken(res.data.access_token);
      await initAuthHeaders();
      setUserId(res.data.user_id);
      setIsAuthenticated(true);
      Alert.alert('Login Success', 'You are now logged in.', [
        { text: 'OK', onPress: () => navigation.replace('Home', {}) },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid or expired QR code';
      Alert.alert('Login Failed', msg, [
        { text: 'Retry', onPress: () => setScanned(false) },
        { text: 'Cancel', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera Permission Required</Text>
        <Text style={styles.hint}>Please grant camera permission to scan QR codes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type="back"
        barCodeScannerSettings={{ barCodeTypes: ['qr'] }}
        onBarCodeScanned={handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>Align QR code within the frame</Text>
        </View>
      </Camera>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Logging in...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: '#1d9bf0',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanText: {
    marginTop: XSpacing.lg,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    marginTop: XSpacing.md,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: XSpacing.xxl,
    backgroundColor: XColors.background,
  },
  title: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    marginBottom: XSpacing.sm,
  },
  hint: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
    textAlign: 'center',
    marginBottom: XSpacing.lg,
  },
  button: {
    backgroundColor: XColors.primary,
    paddingVertical: XSpacing.md,
    paddingHorizontal: XSpacing.xl,
    borderRadius: XBorderRadius.full,
    marginBottom: XSpacing.md,
  },
  buttonText: {
    ...XTypography.bodyLarge,
    color: '#ffffff',
    fontWeight: '700',
  },
  linkButton: {
    padding: XSpacing.sm,
  },
  linkText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
});
