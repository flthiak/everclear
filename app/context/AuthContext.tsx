import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import SecureStore from '../../lib/secureStorePolyfill';
// import { sendWhatsAppMessage } from '../lib/whatsappService'; // Assuming backend handles WhatsApp now
import { useRouter } from 'expo-router';

// Assuming backend handles dev mode differentiation
// const DEV_MODE = false;

interface UserProfile {
  id: string;
  phone_number: string;
  roleId: string; // Ensure consistent casing if needed
  name?: string; // Add name if backend returns it
  isAdmin?: boolean; // Add isAdmin property for permission checking
}

interface AuthContextProps {
  user: UserProfile | null;
  isLoading: boolean;
  // --- New Setup Flow Methods ---
  requestVerificationPin: (name: string, phoneNumber: string) => Promise<boolean>;
  verifySetupPinAndCreateUser: (phoneNumber: string, verificationPin: string, name: string) => Promise<boolean>;
  // --- Existing Methods ---
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  isUserAdmin: () => boolean; // New method to check admin status
  // generateSecurePin is removed as backend handles final PIN generation
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  isLoading: true,
  requestVerificationPin: async () => false,
  verifySetupPinAndCreateUser: async () => false,
  login: async () => false,
  logout: async () => {},
  isAuthenticated: () => false,
  isUserAdmin: () => false // Default implementation for admin check
});

// Key for secure storage
const USER_STORAGE_KEY = 'everclear_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // generateSecurePin and isSequential removed from frontend context

  // Check for existing session on app start
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const userDataStr = await SecureStore.getItem(USER_STORAGE_KEY);

        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // --- New Setup Flow Implementation ---

  /**
   * Calls the backend to generate a temporary verification PIN 
   * and send it via WhatsApp.
   */
  const requestVerificationPin = async (name: string, phoneNumber: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log(`[AuthContext] Requesting verification PIN for ${name} at ${phoneNumber}`);
      
      // --- Placeholder for Backend Call --- 
      // Replace with your actual API call
      const response = await fetch('/api/auth/request-verification', { // Example endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phoneNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to request verification PIN');
      }
      
      // Backend successfully initiated the process
      console.log('[AuthContext] Verification PIN request successful.');
      return true;

    } catch (error: any) {
      console.error('[AuthContext] Error requesting verification PIN:', error);
      Alert.alert('Error', error.message || 'Could not request verification code.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calls the backend to verify the temporary PIN, create the user 
   * profile with a new app PIN, and log the user in.
   */
  const verifySetupPinAndCreateUser = async (phoneNumber: string, verificationPin: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log(`[AuthContext] Verifying setup PIN ${verificationPin} for ${phoneNumber}`);

      // --- Placeholder for Backend Call --- 
      // Replace with your actual API call
      const response = await fetch('/api/auth/verify-setup-pin', { // Example endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, verificationPin, name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Invalid PIN or failed to create user' }));
        throw new Error(errorData.message || 'Verification failed');
      }

      // Backend verified PIN, created user, and returned user data/token
      const userData: UserProfile = await response.json(); // Assuming backend returns UserProfile compatible data
      
      if (!userData || !userData.id) { // Basic validation of response
         throw new Error('Invalid response from server after verification.');
      }

      console.log('[AuthContext] Setup PIN verified, user created:', userData.id);

      // Save user profile to secure storage
      await SecureStore.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);

      // No need to send PIN via WhatsApp here - user already has it or backend handles separately if needed
      
      console.log('[AuthContext] User setup complete and logged in.');
      return true;

    } catch (error: any) {
      console.error('[AuthContext] Error verifying setup PIN:', error);
      // Clean up potentially partially stored user data if needed?
      setUser(null);
      await SecureStore.removeItem(USER_STORAGE_KEY).catch((e: Error) => console.error("Failed to clear storage on error", e));
      Alert.alert('Verification Failed', error.message || 'Could not verify your PIN or create account.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // --- Existing Login/Logout Implementation ---

  const login = async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('verify_user_pin_only', {
          p_pin: pin
        });

      if (error) {
        // Check for the specific error about public.user_profile table
        if (error.message && error.message.includes('relation "public.user_profile" does not exist')) {
          console.error('[AuthContext] Database setup error: user_profile not found');
          Alert.alert(
            'Database Setup Required', 
            'Please run the database migrations to create the required tables. Contact your administrator.'
          );
        } else {
          // Handle other specific errors
          console.error('[AuthContext] Login RPC error:', error);
          Alert.alert('Login Failed', error.message || 'An error occurred');
        }
        return false;
      }

      if (data && data.length > 0) {
        // Get the admin status from the is_admin field in user_profile
        // If is_admin is TRUE in the database, grant full access to the entire app
        const isAdmin = data[0].is_admin === true;
        
        const userProfile: UserProfile = {
          id: data[0].id,
          phone_number: data[0].phone_number,
          roleId: data[0].role_id,
          name: data[0].name,
          isAdmin: isAdmin // Set the admin status
        };

        await SecureStore.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
        setUser(userProfile);
        
        // Save admin status to AsyncStorage for AdminProtected component
        if (userProfile.isAdmin) {
          await AsyncStorage.setItem('user_is_admin', 'true');
        } else {
          await AsyncStorage.removeItem('user_is_admin');
        }
        
        console.log('[AuthContext] Login successful for user:', userProfile.id, 'Admin:', userProfile.isAdmin);
        return true;
      } else {
        Alert.alert('Login Failed', 'Invalid PIN');
        return false;
      }
    } catch (error: any) {
      console.error('[AuthContext] Unexpected error during login:', error);
      Alert.alert('Login Failed', 'Something went wrong. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setUser(null);
      await SecureStore.removeItem(USER_STORAGE_KEY);
      // Also remove the admin status from AsyncStorage
      await AsyncStorage.removeItem('user_is_admin');
      // Optionally call backend to invalidate token if using server sessions
      console.log('[AuthContext] User logged out.');
      // Navigation should be handled by the component calling logout or the root layout
    } catch (error) {
      console.error('[AuthContext] Error during logout:', error);
      // Still attempt to clear state even if storage fails
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = (): boolean => {
    return !!user;
  };

  // Add method to check if user is admin
  const isUserAdmin = (): boolean => {
    return !!user?.isAdmin;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      requestVerificationPin,
      verifySetupPinAndCreateUser,
      login,
      logout,
      isAuthenticated,
      isUserAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext; 