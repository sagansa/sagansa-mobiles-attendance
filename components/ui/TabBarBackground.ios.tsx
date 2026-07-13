import { useContext } from 'react';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

// Access bottom tab bar height context set by expo-router's Tabs navigator (SDK 56+)
const BottomTabBarHeightContext = require('expo-router/build/react-navigation/bottom-tabs/utils/BottomTabBarHeightContext').BottomTabBarHeightContext;

export default function BlurTabBarBackground() {
  return (
    <BlurView
      // System chrome material automatically adapts to the system's theme
      // and matches the native tab bar appearance on iOS.
      tint="systemChromeMaterial"
      intensity={100}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function useBottomTabOverflow(): number {
  return useContext(BottomTabBarHeightContext) ?? 0;
}