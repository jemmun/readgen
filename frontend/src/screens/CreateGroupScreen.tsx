import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { groupsApi } from '../api/groups';
import { useI18n } from '../i18n/I18nContext';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

type Props = StackScreenProps<RootStackParamList, 'CreateGroup'>;

export default function CreateGroupScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await groupsApi.create({ name, description: description || undefined, is_private: isPrivate });
      navigation.goBack();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('createGroup') || 'Create Group'}</Text>
          <Text style={styles.subtitle}>
            Create a space for collaborative novel writing with friends
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          label="Group Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          mode="outlined"
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          textColor={XColors.textPrimary}
        />

        <TextInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          mode="outlined"
          multiline
          numberOfLines={3}
          outlineColor={XColors.border}
          activeOutlineColor={XColors.primary}
          textColor={XColors.textPrimary}
        />

        {/* Privacy Toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Private Group</Text>
            <Text style={styles.switchDesc}>
              Only invited members can see and join this group
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: XColors.border, true: XColors.primary }}
            thumbColor={isPrivate ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: XColors.background,
  },
  scrollContent: {
    padding: XSpacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: XSpacing.xl,
  },
  title: {
    ...XTypography.headlineMedium,
    color: XColors.textPrimary,
    marginBottom: XSpacing.xs,
  },
  subtitle: {
    ...XTypography.bodyMedium,
    color: XColors.textSecondary,
  },
  input: {
    marginBottom: XSpacing.lg,
    backgroundColor: XColors.background,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: XSpacing.md,
    marginBottom: XSpacing.xl,
  },
  switchInfo: {
    flex: 1,
    marginRight: XSpacing.lg,
  },
  switchLabel: {
    ...XTypography.titleLarge,
    color: XColors.textPrimary,
    fontWeight: '700',
    marginBottom: XSpacing.xs,
  },
  switchDesc: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
  },
  button: {
    backgroundColor: XColors.primary,
    paddingVertical: XSpacing.md,
    borderRadius: XBorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...XTypography.titleLarge,
    color: '#ffffff',
    fontWeight: '700',
  },
  error: {
    ...XTypography.bodySmall,
    color: XColors.error,
    marginBottom: XSpacing.md,
  },
});
