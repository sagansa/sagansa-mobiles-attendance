import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/hooks/useAuth';

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const closeMenu = () => setIsVisible(false);

  const performLogout = async () => {
    closeMenu();
    setIsProcessing(true);
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch {
      // Ignore error; AuthProvider already clears state on failure.
    } finally {
      setIsProcessing(false);
    }
  };

  const requestLogoutConfirmation = () => {
    const execute = () => {
      void performLogout();
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm('Yakin ingin keluar dari aplikasi?');
        if (confirmed) {
          execute();
        }
      }
      return;
    }

    Alert.alert('Keluar', 'Yakin ingin keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: execute },
    ]);
  };

  const handleProfilePress = () => {
    closeMenu();
    router.push('/profile');
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Buka menu pengguna"
        onPress={() => setIsVisible(true)}
        style={styles.trigger}
      >
        <MaterialIcons name="menu" size={28} color="#111827" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={closeMenu} />
          <View style={styles.menu}>
            <Text style={styles.userName}>{user?.name ?? 'Pengguna'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleProfilePress}>
              <MaterialIcons name="person" size={20} color="#1D4ED8" style={styles.menuIcon} />
              <Text style={styles.menuText}>Profil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={requestLogoutConfirmation}
              disabled={isProcessing}
            >
              <MaterialIcons name="logout" size={20} color="#DC2626" style={styles.menuIcon} />
              <Text style={[styles.menuText, styles.logoutText]}>
                {isProcessing ? 'Keluar...' : 'Keluar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.3)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 56,
    paddingRight: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menu: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  logoutItem: {
    marginTop: 8,
  },
  logoutText: {
    color: '#DC2626',
  },
});
