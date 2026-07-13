import { Redirect, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CenteredLoader } from '@/components/CenteredLoader';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isBootstrapping, isAuthenticated } = useAuth();
  const [isCheckingTenant, setIsCheckingTenant] = useState(true);
  const [hasTenant, setHasTenant] = useState(false);

  // Safety net: pastikan user sudah punya active_tenant_id sebelum masuk app.
  // Login normal sudah menangani ini; guard ini menangani edge case
  // (mis. user multi-tenant yang belum memilih saat app restore).
  useEffect(() => {
    if (!isAuthenticated || isBootstrapping) {
      setIsCheckingTenant(false);
      return;
    }

    let mounted = true;
    void (async () => {
      const tenantId = await AsyncStorage.getItem('active_tenant_id');
      if (mounted) {
        setHasTenant(Boolean(tenantId));
        setIsCheckingTenant(false);
      }
    })();
    return () => { mounted = false; };
  }, [isAuthenticated, isBootstrapping]);

  if (isBootstrapping || isCheckingTenant) {
    return <CenteredLoader />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasTenant) {
    return <Redirect href="/(auth)/select-tenant" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Cuti',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="airplane" color={color} />,
        }}
      />
    </Tabs>
  );
}
