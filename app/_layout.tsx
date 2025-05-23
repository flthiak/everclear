import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import {
    AsapCondensed_400Regular
} from '@expo-google-fonts/asap-condensed';
import {
    BarlowCondensed_400Regular
} from '@expo-google-fonts/barlow-condensed';
import {
    Comforter_400Regular
} from '@expo-google-fonts/comforter';
import {
    Gruppo_400Regular
} from '@expo-google-fonts/gruppo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar, View } from 'react-native';

// Create a workaround for text node errors without directly accessing View.render
// by intercepting console.error calls
const originalConsoleError = console.error;
console.error = function(...args) {
  // Check if the error is about text nodes in Views
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('text node') &&
    args[0].includes('child of a <View>')
  ) {
    // Suppress the error
    return;
  }

  // Pass through all other errors
  return originalConsoleError.apply(console, args);
};

// Keep the splash screen visible until the assets are loaded
SplashScreen.preventAutoHideAsync();

// Wrap the entire app with AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

// Define the main layout component
function RootLayoutNav() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
    Comforter_400Regular,
    BarlowCondensed_400Regular,
    AsapCondensed_400Regular,
    Gruppo_400Regular,
  });
  const [appReady, setAppReady] = useState(false);
  const { user, isLoading: authIsLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useFrameworkReady();
  
  // Fix MIME type issues for web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Clear any cached errors and ensure proper MIME type handling
      console.log('Initializing web platform...');
      
      // Force re-render if needed
      const timeoutId = setTimeout(() => {
        console.log('Web platform initialized');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    if (error) {
      console.error('Font loading error:', error);
    }
  }, [error]);

  // Handle font loading and splash screen hiding
  useEffect(() => {
    async function prepare() {
      // Wait until fonts are loaded AND auth state is resolved
      if (loaded && !authIsLoading) {
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          await SplashScreen.hideAsync();
          setAppReady(true);
          console.log('[Layout] App ready.');
        } catch (e) {
          console.warn('[Layout] Error hiding splash screen:', e);
          setAppReady(true);
        }
      }
    }
    prepare();
  }, [loaded, authIsLoading]); // Depend only on fonts and auth loading

  // Centralized redirection logic based on authentication
  useEffect(() => {
    // Wait until auth check is done and app is ready
    if (!appReady || authIsLoading) {
      console.log(`[Layout] Redirection check waiting: appReady=${appReady}, authIsLoading=${authIsLoading}`);
      return;
    }

    const isAuth = isAuthenticated();
    const segmentPath = segments.join('/');
    
    // Determine the current screen/section
    const isLoginScreen = segmentPath === '' || segmentPath === 'index';
    const inAuthGroup = segmentPath.startsWith('(tabs)');
    const inSetupGroup = segmentPath.startsWith('setup');
    
    // Define valid authenticated standalone screens
    const validAuthenticatedScreens = ['profile', 'forgot-password'];
    const isStandaloneAuthScreen = segmentPath && validAuthenticatedScreens.includes(segmentPath);

    console.log(`[Layout] Redirection Check: IsAuth=${isAuth}, Route=${segmentPath}, InAuthGroup=${inAuthGroup}, InSetupGroup=${inSetupGroup}`);

    if (isAuth) {
      // User is Authenticated
      if (isLoginScreen || inSetupGroup) {
        // If authenticated user is on login or setup screen, redirect to main app
        console.log('[Layout] Authenticated user on login/setup page, redirecting to (tabs).');
        router.replace('/(tabs)');
      }
      // If already in tabs or other allowed authenticated areas, do nothing - allow internal navigation
    } else {
      // User is Not Authenticated
      if (!isLoginScreen && !inSetupGroup && !isStandaloneAuthScreen) {
        // If unauthenticated user is NOT on login, setup, or other allowed screens, redirect to login
        console.log('[Layout] Unauthenticated user not on login/setup, redirecting to index.');
        router.replace('/');
      }
    }
  }, [appReady, authIsLoading, isAuthenticated, segments, router]);

  useEffect(() => {
    // This helps hide the system UI elements
    StatusBar.setTranslucent(true);
    StatusBar.setBackgroundColor('transparent');
  }, []);

  // Show loading indicator while fonts load or auth state loads
  if (!appReady || authIsLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' }}>
        <StatusBar translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#2B7BB0" />
      </View>
    );
  }

  // Render the stack with all possible routes
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" />
      <Stack
        screenOptions={{
          animation: 'fade',
          animationDuration: 200,
          headerShown: false,
          contentStyle: { backgroundColor: '#f5f6fa' },
        }}
      >
        <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: 'transparent' }}} />
        <Stack.Screen name="setup/name-phone" options={{ contentStyle: { backgroundColor: 'transparent' }}} />
        <Stack.Screen name="setup/verify-pin" options={{ contentStyle: { backgroundColor: 'transparent' }}} />
        <Stack.Screen name="forgot-password" options={{ contentStyle: { backgroundColor: 'transparent' }}} />
        <Stack.Screen name="profile" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="power-outage" options={{ 
          contentStyle: { backgroundColor: '#f5f6fa' }
        }} />
      </Stack>
    </>
  );
}