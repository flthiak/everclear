import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Web fallback implementation using localStorage
const webStore = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from localStorage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in localStorage:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from localStorage:', error);
    }
  }
};

// Use SecureStore for native platforms, localStorage for web
const store = Platform.OS === 'web' ? webStore : {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync
};

export const getItem = store.getItem;
export const setItem = store.setItem;
export const removeItem = store.removeItem;

export default {
  getItem,
  setItem,
  removeItem,
};