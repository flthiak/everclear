import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cache management
interface CacheOptions {
  expiry?: number; // Time in milliseconds before cache is considered stale
  forceRefresh?: boolean; // Whether to bypass cache and force a refresh
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

// Query with caching
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<any>,
  options: CacheOptions = {}
): Promise<{ data: T; timestamp: number }> {
  const { expiry = 5 * 60 * 1000, forceRefresh = false } = options;

  // Check cache first unless forceRefresh is true
  if (!forceRefresh) {
    try {
      const cachedData = await AsyncStorage.getItem(`cache_${key}`);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData) as CachedData<T>;
        const now = Date.now();
        
        // If cache is still valid, return it
        if (now - parsedData.timestamp < expiry) {
          return parsedData;
        }
      }
    } catch (error) {
      console.error(`Error reading cache for ${key}:`, error);
      // Continue with actual query if cache read fails
    }
  }

  // Perform the actual query
  try {
    const response = await queryFn();
    const result = {
      data: response.data as T,
      timestamp: Date.now(),
    };

    // Cache the result
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(result));
    } catch (error) {
      console.error(`Error writing cache for ${key}:`, error);
    }

    return result;
  } catch (error) {
    console.error(`Error executing query for ${key}:`, error);
    throw error;
  }
}

// Invalidate all cached data
export async function invalidateCache(key?: string): Promise<void> {
  try {
    if (key) {
      // Invalidate specific cache key
      await AsyncStorage.removeItem(`cache_${key}`);
    } else {
      // Get all keys and invalidate only cache keys
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith('cache_'));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}
