import * as SecureStore from 'expo-secure-store';

export const getItem = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('Error getting item from secure store:', error);
    return null;
  }
};

export const setItem = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('Error setting item in secure store:', error);
  }
};

export const removeItem = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('Error removing item from secure store:', error);
  }
};

export default {
  getItem,
  setItem,
  removeItem,
}; 