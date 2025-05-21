import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface AdminProtectedProps {
  children: React.ReactNode;
}

export default function AdminProtected({ children }: AdminProtectedProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // Check if we have cached admin status
        const cachedAdminStatus = await AsyncStorage.getItem('user_is_admin');
        
        if (cachedAdminStatus === 'true') {
          setIsAdmin(true);
          setIsLoading(false);
          return;
        }
        
        // If no cached admin status or not admin, redirect to home
        setIsAdmin(false);
        setIsLoading(false);
      } catch (error) {
        console.error('Error in admin check:', error);
        setIsAdmin(false);
        setIsLoading(false);
        router.navigate('/(tabs)');
      }
    }
    
    checkAdminStatus();
  }, []);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4568dc" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }
  
  // Only render children if user is admin
  return isAdmin ? <>{children}</> : null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
}); 