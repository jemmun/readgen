import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import * as AuthSession from 'expo-auth-session';
import { authApi, initAuthHeaders } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

// Replace these with your actual OAuth client IDs from Google Cloud / Apple Developer
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID || 'YOUR_APPLE_CLIENT_ID';

const redirectUri = AuthSession.makeRedirectUri({ scheme: 'novelgen' });

const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

interface Props {
  onSuccess?: () => void;
}

export default function SocialLoginButtons({ onSuccess }: Props) {
  const { setUserId, setIsAuthenticated } = useAuth();

  const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      prompt: AuthSession.Prompt.SelectAccount,
    },
    googleDiscovery
  );

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      handleOAuthLogin('google', id_token);
    }
  }, [googleResponse]);

  const handleOAuthLogin = async (provider: string, token: string) => {
    try {
      const res = await authApi.oauthLogin({ provider, token });
      await authApi.setToken(res.data.access_token);
      await initAuthHeaders();
      setUserId(res.data.user_id);
      setIsAuthenticated(true);
      onSuccess?.();
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.detail || 'OAuth login failed');
    }
  };

  const handleGoogle = async () => {
    if (!googleRequest) return;
    await googlePromptAsync();
  };

  const handleApple = () => {
    // Apple Sign-In requires native iOS implementation or expo-apple-authentication
    // For now, show a placeholder alert
    Alert.alert('Apple Sign-In', 'Configure APPLE_CLIENT_ID to enable Apple Sign-In.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.socialBtn, styles.googleBtn]}
          onPress={handleGoogle}
          activeOpacity={0.8}
        >
          <Text style={styles.socialIcon}>G</Text>
          <Text style={styles.socialText}>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialBtn, styles.appleBtn]}
          onPress={handleApple}
          activeOpacity={0.8}
        >
          <Text style={styles.socialIcon}>🍎</Text>
          <Text style={[styles.socialText, { color: '#ffffff' }]}>Apple</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: XSpacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: XSpacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: XColors.border,
  },
  dividerText: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginHorizontal: XSpacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: XSpacing.md,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: XSpacing.md,
    paddingHorizontal: XSpacing.lg,
    borderRadius: XBorderRadius.full,
    flex: 1,
    borderWidth: 1,
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    borderColor: '#dadce0',
  },
  appleBtn: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialIcon: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: XSpacing.sm,
  },
  socialText: {
    ...XTypography.bodyMedium,
    fontWeight: '600',
    color: '#3c4043',
  },
});
