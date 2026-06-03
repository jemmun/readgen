import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import CreateNovelScreen from '../screens/CreateNovelScreen';
import NovelDetailScreen from '../screens/NovelDetailScreen';
import LibraryBookDetailScreen from '../screens/LibraryBookDetailScreen';
import ReaderScreen from '../screens/ReaderScreen';
import GenerationScreen from '../screens/GenerationScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import SearchUsersScreen from '../screens/SearchUsersScreen';
import CreationScreen from '../screens/CreationScreen';
import CollaborationScreen from '../screens/CollaborationScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import IllustrationsScreen from '../screens/IllustrationsScreen';
import IllustrationCreateScreen from '../screens/IllustrationCreateScreen';
import IllustrationDetailScreen from '../screens/IllustrationDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import MyQRCodeScreen from '../screens/MyQRCodeScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import { useAuth } from '../contexts/AuthContext';

export type RootStackParamList = {
  Home: { activeTab?: string };
  CreateNovel: {
    novelId?: number;
    title?: string;
    theme_description?: string;
    genre?: string;
    style?: string;
    tone?: string;
    setting?: string;
    protagonist_info?: string;
    target_audience?: string;
    language?: string;
    max_chapters?: number;
  } | undefined;
  NovelDetail: { novelId: number };
  Reader: { novelId: number; chapterId?: number; readOnly?: boolean };
  Generation: { novelId: number; sessionId: number; type: 'initial' | 'continue'; outline?: string };
  Login: undefined;
  Register: undefined;
  CreatePost: undefined;
  PostDetail: { postId: number };
  LibraryBookDetail: { novelId: number };
  UserProfile: { userId: number };
  SearchUsers: undefined;
  GroupDetail: { groupId: number };
  CreateGroup: undefined;
  IllustrationCreate: undefined;
  IllustrationDetail: { illustrationId: number };
  QRScanner: undefined;
  MyQRCode: undefined;
  Notifications: undefined;
  Messages: undefined;
  Chat: { userId: number; userName: string };
  Feedback: undefined;
  Achievements: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d9bf0" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Home' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#0f1419',
          headerTitleStyle: { 
            fontWeight: 'bold',
            fontSize: 17,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CreateNovel" component={CreateNovelScreen} />
        <Stack.Screen name="NovelDetail" component={NovelDetailScreen} />
        <Stack.Screen name="Reader" component={ReaderScreen} />
        <Stack.Screen name="Generation" component={GenerationScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="CreatePost" component={CreatePostScreen} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="LibraryBookDetail" component={LibraryBookDetailScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="SearchUsers" component={SearchUsersScreen} />
        <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
        <Stack.Screen name="IllustrationCreate" component={IllustrationCreateScreen} />
        <Stack.Screen name="IllustrationDetail" component={IllustrationDetailScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyQRCode" component={MyQRCodeScreen} options={{ title: 'My QR Code' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
        <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params.userName })} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: 'Feedback' }} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'Achievements' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
