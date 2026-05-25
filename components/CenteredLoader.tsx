import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface CenteredLoaderProps {
  size?: 'small' | 'large';
}

export function CenteredLoader({ size = 'large' }: CenteredLoaderProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
