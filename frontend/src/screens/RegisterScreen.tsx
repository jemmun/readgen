import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { authApi, initAuthHeaders } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import SocialLoginButtons from '../components/SocialLoginButtons';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

type RegisterScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUserId, setIsAuthenticated } = useAuth();

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.register({
        username,
        password,
        display_name: displayName || undefined,
      });
      await authApi.setToken(res.data.access_token);
      await initAuthHeaders();
      setUserId(res.data.user_id);
      setIsAuthenticated(true);
      navigation.replace('Home', {});
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the community</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          style={styles.input}
          mode="outlined"
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          textColor={XColors.textPrimary}
        />
        <TextInput
          label="Display Name (optional)"
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
          mode="outlined"
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          textColor={XColors.textPrimary}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          textColor={XColors.textPrimary}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkHighlight}>Login</Text>
          </Text>
        </TouchableOpacity>

        <SocialLoginButtons onSuccess={() => navigation.replace('Home', {})} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: XSpacing.xl,
    backgroundColor: XColors.background,
  },
  card: {
    padding: XSpacing.xxl,
    borderRadius: XBorderRadius.lg,
    backgroundColor: XColors.surface,
  },
  title: {
    ...XTypography.headlineLarge,
    textAlign: 'center',
    marginBottom: XSpacing.sm,
    color: XColors.textPrimary,
  },
  subtitle: {
    ...XTypography.bodyMedium,
    textAlign: 'center',
    marginBottom: XSpacing.xl,
    color: XColors.textSecondary,
  },
  input: {
    marginBottom: XSpacing.md,
    backgroundColor: XColors.background,
  },
  button: {
    backgroundColor: XColors.primary,
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.full,
    alignItems: 'center',
    marginTop: XSpacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...XTypography.titleLarge,
    color: '#ffffff',
    fontWeight: '700',
  },
  linkButton: {
    marginTop: XSpacing.lg,
    alignItems: 'center',
  },
  linkText: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
  linkHighlight: {
    color: XColors.primary,
    fontWeight: '600',
  },
  error: {
    ...XTypography.bodySmall,
    color: XColors.error,
    marginBottom: XSpacing.md,
    textAlign: 'center',
  },
});
