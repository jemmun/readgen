import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Avatar, Divider, Icon } from 'react-native-paper';
import { useI18n } from '../i18n/I18nContext';
import { XColors } from '../theme/xStyle';

export type SidebarItem = 'ideas' | 'library' | 'discover' | 'creation' | 'collaboration' | 'messages' | 'illustrations' | 'settings';

interface SidebarProps {
  activeItem: SidebarItem;
  onNavigate: (item: SidebarItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userDisplayName?: string;
  onProfile?: () => void;
  onLogout?: () => void;
  onScan?: () => void;
  onNotifications?: () => void;
  unreadCount?: number;
}

const icons: Record<SidebarItem, string> = {
  ideas: 'lightbulb-on-outline',
  library: 'book-open-page-variant',
  discover: 'compass-outline',
  creation: 'pen',
  collaboration: 'account-group-outline',
  messages: 'email-outline',
  illustrations: 'palette-outline',
  settings: 'cog-outline',
};

const activeIcons: Record<SidebarItem, string> = {
  ideas: 'lightbulb-on',
  library: 'book-open-page-variant',
  discover: 'compass',
  creation: 'pen',
  collaboration: 'account-group',
  messages: 'email',
  illustrations: 'palette',
  settings: 'cog',
};

export default function Sidebar({
  activeItem,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  userDisplayName,
  onProfile,
  onLogout,
  onScan,
  onNotifications,
  unreadCount,
}: SidebarProps) {
  const { t } = useI18n();
  const width = isCollapsed ? 64 : 260;
  const [userMenuExpanded, setUserMenuExpanded] = useState(false);

  const renderNavItem = (item: SidebarItem) => {
    const isActive = activeItem === item;
    return (
      <TouchableOpacity
        key={item}
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={() => onNavigate(item)}
      >
        <Icon
          source={isActive ? activeIcons[item] : icons[item]}
          color={isActive ? '#ffffff' : '#a0a0b0'}
          size={24}
        />
        {!isCollapsed && (
          <Text
            variant="bodyMedium"
            style={[styles.navLabel, isActive && styles.navLabelActive]}
            numberOfLines={1}
          >
            {t(item)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { width }]}>
      {/* Header with Logo */}
      <View style={styles.header}>
        {!isCollapsed && (
          <View style={styles.logoContainer}>
            <Icon source="book-open-page-variant" color={XColors.primary} size={28} />
            <Text variant="titleLarge" style={styles.logoText}>
              ReadGen
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={onToggleCollapse}
        >
          <Icon
            source={isCollapsed ? 'chevron-right' : 'chevron-left'}
            color="#ffffff"
            size={24}
          />
        </TouchableOpacity>
      </View>

      <Divider />

      {/* Navigation Items */}
      <ScrollView style={styles.navList}>
        {(['ideas', 'library', 'creation', 'collaboration', 'illustrations', 'messages'] as SidebarItem[]).map(
          renderNavItem
        )}
      </ScrollView>

      <Divider />

      {/* User Section */}
      <View style={styles.userSection}>
        {/* User Profile - Main */}
        <TouchableOpacity
          style={styles.userButton}
          onPress={() => {
            if (!isCollapsed) {
              setUserMenuExpanded(!userMenuExpanded);
            } else if (onProfile) {
              onProfile();
            }
          }}
          disabled={!onProfile && isCollapsed}
        >
          <Avatar.Text
            size={isCollapsed ? 36 : 40}
            label={userDisplayName?.charAt(0).toUpperCase() || 'U'}
            style={styles.avatar}
          />
          {!isCollapsed && (
            <View style={styles.userInfo}>
              <Text variant="bodyMedium" style={styles.userName} numberOfLines={1}>
                {userDisplayName || 'User'}
              </Text>
            </View>
          )}
          {!isCollapsed && (
            <Icon
              source={userMenuExpanded ? 'chevron-up' : 'chevron-down'}
              color="#a0a0b0"
              size={20}
            />
          )}
        </TouchableOpacity>

        {/* Sub-menu: Profile + Settings + Logout */}
        {!isCollapsed && userMenuExpanded && (
          <View style={styles.subMenu}>
            <TouchableOpacity
              style={styles.subMenuItem}
              onPress={() => {
                setUserMenuExpanded(false);
                onProfile?.();
              }}
            >
              <Icon source="account-outline" color="#a0a0b0" size={20} />
              <Text style={styles.subMenuLabel}>{t('profile') || 'Profile'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subMenuItem}
              onPress={() => {
                setUserMenuExpanded(false);
                onScan?.();
              }}
            >
              <Icon source="qrcode-scan" color="#a0a0b0" size={20} />
              <Text style={styles.subMenuLabel}>Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subMenuItem, activeItem === 'settings' && styles.subMenuItemActive]}
              onPress={() => {
                setUserMenuExpanded(false);
                onNavigate('settings');
              }}
            >
              <Icon source="cog-outline" color="#a0a0b0" size={20} />
              <Text style={styles.subMenuLabel}>{t('settings')}</Text>
            </TouchableOpacity>

            {onLogout && (
              <TouchableOpacity
                style={styles.subMenuItem}
                onPress={() => {
                  setUserMenuExpanded(false);
                  onLogout();
                }}
              >
                <Icon source="logout" color="#ff6b6b" size={20} />
                <Text style={[styles.subMenuLabel, { color: '#ff6b6b' }]}>
                  {t('logout') || 'Logout'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    height: '100%',
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: '#2a2a3e',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 4,
  },
  navList: {
    flex: 1,
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: XColors.primary,
  },
  navLabel: {
    flex: 1,
    color: '#a0a0b0',
    marginLeft: 16,
    fontSize: 15,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  userSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: XColors.primary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#ffffff',
    fontWeight: '500',
  },
  subMenu: {
    marginLeft: 52,
    marginBottom: 8,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  subMenuItemActive: {
    backgroundColor: 'rgba(29, 155, 240, 0.15)',
  },
  subMenuLabel: {
    color: '#a0a0b0',
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '500',
  },
  notifButton: {
    padding: 8,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
