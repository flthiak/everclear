import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

/**
 * Higher-order component that wraps content requiring admin permissions.
 * It will render children only if the user has admin privileges.
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, isUserAdmin } = useAuth();
  
  // If no user or not admin, render nothing
  if (!user || !isUserAdmin()) {
    return null;
  }
  
  return <>{children}</>;
}

/**
 * Component that displays the passed children only if user is admin,
 * otherwise shows a permission denied message
 */
export function AdminProtectedSection({ 
  children, 
  fallbackMessage = "You don't have permission to access this section." 
}: { 
  children: React.ReactNode;
  fallbackMessage?: string;
}) {
  const { user, isUserAdmin } = useAuth();
  
  if (!user || !isUserAdmin()) {
    return (
      <View style={styles.permissionDenied}>
        <Text style={styles.permissionText}>{fallbackMessage}</Text>
      </View>
    );
  }
  
  return <>{children}</>;
}

/**
 * Helper function to check if current user is admin
 * Can be used in any component that doesn't have access to the auth context
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const isAdmin = await AsyncStorage.getItem('user_is_admin');
    return isAdmin === 'true';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

const styles = StyleSheet.create({
  permissionDenied: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  }
}); 