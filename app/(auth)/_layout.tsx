import { Redirect, Stack } from 'expo-router';

import { CenteredLoader } from '@/components/CenteredLoader';
import { useAuth } from '@/hooks/useAuth';

export default function AuthStackLayout() {
  const { isBootstrapping, isAuthenticated } = useAuth();

  if (isBootstrapping) {
    return <CenteredLoader />;
  }

  // Don't auto-redirect if authenticated - let the login flow handle tenant selection
  if (!isAuthenticated) {
    // Only show auth screens when not authenticated
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    );
  }

  // When authenticated, show select-tenant screen
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="select-tenant" />
    </Stack>
  );
}
