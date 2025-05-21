import AppHeader from '@/components/AppHeader';
import HamburgerMenu from '@/components/HamburgerMenu';
import { Stack, usePathname } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import BottomNavBar, { TabName } from '../../components/BottomNavBar';

export default function TabLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const openMenu = () => setIsMenuOpen(true);
  const closeMenu = () => setIsMenuOpen(false);

  // Determine active tab based on current pathname
  const getActiveTab = (): TabName => {
    if (pathname === '/(tabs)' || pathname === '/(tabs)/index') return 'home';
    if (pathname.includes('/sales')) return 'sales';
    if (pathname.includes('/deliveries')) return 'deliveries';
    if (pathname.includes('/payments')) return 'payments';
    if (pathname.includes('/stock')) return 'stock';
    if (pathname.includes('/supplies')) return 'supplies';
    if (pathname.includes('/management')) return 'management';
    return 'home'; // Default
  };

  return (
    <View style={styles.container}>
      {isMenuOpen && (
        <HamburgerMenu isOpen={isMenuOpen} onClose={closeMenu} />
      )}
      <Animated.View 
        style={{ flex: 1 }}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
      >
        <AppHeader onMenuPress={openMenu} />
        <Stack
          screenOptions={{
            headerShown: false
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </Animated.View>
      <BottomNavBar activeTab={getActiveTab()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    paddingBottom: 10, // Add bottom padding to account for the nav bar
  }
});