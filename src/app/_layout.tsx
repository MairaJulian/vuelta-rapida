import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useLandscapeLock } from '@/hooks/useLandscapeLock';

export default function RootLayout() {
  useLandscapeLock();
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar hidden />
      <NavigationBar hidden />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
