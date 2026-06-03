import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useWindowDimensions } from 'react-native';
import Sidebar, { SidebarItem } from '../components/Sidebar';
import IdeasScreen from './IdeasScreen';
import LibraryScreen from './LibraryScreen';
import DiscoverScreen from './DiscoverScreen';
import CreationScreen from './CreationScreen';
import CollaborationScreen from './CollaborationScreen';
import IllustrationsScreen from './IllustrationsScreen';
import MessagesScreen from './MessagesScreen';
import SettingsScreen from './SettingsScreen';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { authApi } from '../api/auth';
import { notificationsApi } from '../api/notifications';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
  route?: { params?: { activeTab?: string } };
}

const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const COLLAPSE_STORAGE_KEY = 'sidebar_collapsed';

export default function HomeScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width > 768;
  
  const [activeTab, setActiveTab] = useState<SidebarItem>('ideas');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);
  const { userId, logout } = useAuth();

  // Load sidebar state and user info
  useEffect(() => {
    const loadState = async () => {
      const collapsed = await AsyncStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (collapsed !== null) {
        setIsCollapsed(collapsed === 'true');
      }

      try {
        const meRes = await authApi.me();
        if (meRes) {
          setUserDisplayName(meRes.data.display_name || meRes.data.username);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
      try {
        const countRes = await notificationsApi.getUnreadCount();
        setUnreadCount(countRes.data.unread_count);
      } catch (e) {}
    };
    loadState();
  }, []);

  // Handle route params for active tab
  useEffect(() => {
    if (route?.params?.activeTab) {
      setActiveTab(route.params.activeTab as SidebarItem);
    }
  }, [route?.params?.activeTab]);

  const handleNavigate = (item: SidebarItem) => {
    setActiveTab(item);
  };

  const handleToggleCollapse = async () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    await AsyncStorage.setItem(COLLAPSE_STORAGE_KEY, String(newState));
  };

  const handleProfile = () => {
    if (userId) {
      navigation.navigate('UserProfile', { userId });
    }
  };

  const handleLogout = async () => {
    logout();
    navigation.navigate('Login');
  };

  const handleScan = () => {
    navigation.navigate('QRScanner');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  const renderContent = () => {
    switch (activeTab) {
      case 'ideas':
        return <IdeasContent navigation={navigation} />;
      case 'library':
        return <LibraryContent navigation={navigation} />;
      case 'discover':
        return <DiscoverContent />;
      case 'creation':
        return <CreationContent navigation={navigation} />;
      case 'collaboration':
        return <CollaborationContent navigation={navigation} />;
      case 'illustrations':
        return <IllustrationsContent navigation={navigation} />;
      case 'messages':
        return <MessagesContent navigation={navigation} />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <IdeasContent navigation={navigation} />;
    }
  };

  return (
    <View style={styles.container}>
      {isWide && (
        <Sidebar
          activeItem={activeTab}
          onNavigate={handleNavigate}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          userDisplayName={userDisplayName}
          onProfile={handleProfile}
          onLogout={handleLogout}
          onScan={handleScan}
          onNotifications={handleNotifications}
          unreadCount={unreadCount}
        />
      )}
      <View style={[styles.content, isWide && { marginLeft: sidebarWidth }]}>
        {renderContent()}
      </View>
    </View>
  );
}

// Wrapper components for each tab
function IdeasContent({ navigation }: { navigation: HomeScreenNavigationProp }) {
  return <IdeasScreen navigation={navigation} />;
}

function LibraryContent({ navigation }: { navigation: HomeScreenNavigationProp }) {
  return <LibraryScreen navigation={navigation} />;
}

function DiscoverContent() {
  return <DiscoverScreen />;
}

function CreationContent({ navigation }: { navigation: HomeScreenNavigationProp }) {
  return <CreationScreen navigation={navigation} />;
}

function CollaborationContent({ navigation }: { navigation: HomeScreenNavigationProp }) {
  return <CollaborationScreen navigation={navigation} />;
}

function IllustrationsContent({ navigation }: { navigation: HomeScreenNavigationProp }) {
  return <IllustrationsScreen navigation={navigation} />;
}

function MessagesContent({ navigation }: { navigation: HomeScreenNavigationProp }) {
  return <MessagesScreen navigation={navigation} />;
}

function SettingsContent() {
  return <SettingsScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
});
