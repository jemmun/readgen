import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, TextInput as RNTextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { usersApi, UserProfile } from '../api/users';
import { XColors, XTypography, XSpacing, XBorderRadius } from '../theme/xStyle';

interface MentionAutocompleteProps {
  query: string;
  onSelect: (username: string, displayName: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export default function MentionAutocomplete({ query, onSelect, onClose, position }: MentionAutocompleteProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 1) {
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await usersApi.search(query);
        setUsers(res.data.slice(0, 5)); // Limit to 5 results
      } catch (e) {
        console.error('Failed to search users:', e);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchUsers, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!query || users.length === 0 && !loading) {
    return null;
  }

  return (
    <View style={[styles.container, { top: position.top, left: position.left }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={XColors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userItem}
              onPress={() => onSelect(item.username, item.display_name || item.username)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.display_name || item.username)[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {item.display_name || item.username}
                </Text>
                <Text style={styles.username} numberOfLines={1}>
                  @{item.username}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: XColors.surface,
    borderRadius: XBorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 250,
    minWidth: 250,
    zIndex: 1000,
  },
  loadingContainer: {
    padding: XSpacing.lg,
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: XSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: XColors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: XColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: XSpacing.md,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    ...XTypography.bodyMedium,
    fontWeight: '700',
    color: XColors.textPrimary,
  },
  username: {
    ...XTypography.bodySmall,
    color: XColors.textSecondary,
    marginTop: 2,
  },
});
