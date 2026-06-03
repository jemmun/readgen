import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Card, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usersApi, UserProfile } from '../api/users';
import { debounce } from '../utils/debounce';

type SearchUsersScreenProps = StackScreenProps<RootStackParamList, 'SearchUsers'>;

export default function SearchUsersScreen({ navigation }: SearchUsersScreenProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await usersApi.search(q);
      setUsers(res.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(debounce(search, 300), [search]);

  const handleChange = (text: string) => {
    setQuery(text);
    debouncedSearch(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          label="Search users..."
          value={query}
          onChangeText={handleChange}
          style={styles.input}
          mode="outlined"
          autoFocus
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {users.map((user) => (
            <TouchableOpacity
              key={user.id}
              onPress={() => navigation.navigate('UserProfile', { userId: user.id })}
            >
              <Card style={styles.userCard}>
                <Card.Content>
                  <Text variant="titleMedium">
                    {user.display_name || user.username}
                  </Text>
                  <Text variant="bodySmall" style={styles.username}>
                    @{user.username}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}

          {query.trim() && users.length === 0 && !loading && (
            <Text style={styles.noResults}>No users found</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  input: {
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    overflow: 'scroll',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 100,
  },
  userCard: {
    marginBottom: 8,
  },
  username: {
    color: '#888',
  },
  loader: {
    marginTop: 20,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
});
