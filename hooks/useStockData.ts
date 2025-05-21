import { useState, useEffect } from 'react';
import { supabase, cachedQuery, invalidateCache } from '@/lib/supabase';
import { Database } from '@/types/database';
import { PostgrestResponse } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Product = Database['public']['Tables']['products']['Row'];

interface StockItem {
  id: string;
  product_id: string;
  product_sn: string;
  product_name: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product: Product;
  value: number;
  isNew?: boolean;
}

interface DailyProduction {
  id: string;
  product_id: string;
  product_sn: string;
  product_name: string;
  quantity: number;
  created_at: string;
  price: number;
  value: number;
}

export function useStockData() {
  const [error, setError] = useState<string | null>(null);
  const [factoryStock, setFactoryStock] = useState<StockItem[]>([]);
  const [godownStock, setGodownStock] = useState<StockItem[]>([]);
  const [todaysProduction, setTodaysProduction] = useState<DailyProduction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const CACHE_KEYS = {
    FACTORY: 'factory_stock_cache',
    GODOWN: 'godown_stock_cache',
    PRODUCTION: 'today_production_cache',
  };

  const CACHE_EXPIRY = {
    FACTORY: 5 * 60 * 1000, // 5 minutes
    GODOWN: 5 * 60 * 1000, // 5 minutes
    PRODUCTION: 1 * 60 * 1000, // 1 minute
  };

  const getCachedData = async (key: string) => {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        if (now - timestamp < CACHE_EXPIRY[key as keyof typeof CACHE_EXPIRY]) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  };

  const setCachedData = async (key: string, data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  };

  const fetchStockData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all products with caching
      const { data: productsData } = await cachedQuery(
        'products_list',
        async () => await supabase
          .from('products')
          .select('id, product_sn, product_name, factory_price, godown_price, created_at, updated_at')
          .order('product_sn'),
        { expiry: 5 * 60 * 1000 } // 5 minutes cache
      );

      if (!productsData || productsData.length === 0) {
        throw new Error('No products found in the database');
      }

      const products = productsData as unknown as Product[];
      // Store all products
      setAllProducts(products);
      
      const today = new Date().toISOString().split('T')[0];

      // Fetch factory stock with shorter cache
      const { data: factoryData } = await cachedQuery(
        'factory_stock',
        async () => await supabase
          .from('factory_stock')
          .select('id, product_id, product_sn, product_name, quantity, created_at, updated_at')
          .order('product_sn'),
        { expiry: 1 * 60 * 1000 } // 1 minute cache
      );

      // Fetch godown stock with shorter cache
      const { data: godownData } = await cachedQuery(
        'godown_stock',
        async () => await supabase
          .from('godown_stock')
          .select('id, product_id, product_sn, product_name, quantity, created_at, updated_at')
          .order('product_sn'),
        { expiry: 1 * 60 * 1000 } // 1 minute cache
      );

      // Fetch today's production with very short cache
      const { data: productionData } = await cachedQuery(
        'todays_production',
        async () => await supabase
          .from('daily_production')
          .select('*')
          .gte('created_at', today)
          .order('created_at', { ascending: false }),
        { expiry: 30 * 1000 } // 30 seconds cache
      );

      // Process and set the data
      const processedFactoryStock = (factoryData || []).map((item: any) => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) {
          console.warn(`Product not found for ID: ${item.product_id}`);
          return {
            ...item,
            product: {
              id: item.product_id,
              product_sn: item.product_sn,
              product_name: item.product_name,
              factory_price: 0,
              godown_price: 0,
              delivery_price: 0,
              created_at: item.created_at,
              updated_at: item.updated_at
            },
            value: 0
          };
        }
        return {
          ...item,
          product,
          value: item.quantity * (product.factory_price || 0)
        };
      });

      const processedGodownStock = (godownData || []).map((item: any) => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) {
          console.warn(`Product not found for ID: ${item.product_id}`);
          return {
            ...item,
            product: {
              id: item.product_id,
              product_sn: item.product_sn,
              product_name: item.product_name,
              factory_price: 0,
              godown_price: 0,
              delivery_price: 0,
              created_at: item.created_at,
              updated_at: item.updated_at
            },
            value: 0
          };
        }
        return {
          ...item,
          product,
          value: item.quantity * (product.godown_price || 0)
        };
      });

      setFactoryStock(processedFactoryStock);
      setGodownStock(processedGodownStock);
      setTodaysProduction(productionData || []);

      // Mark items as new in factory stock
      const updatedFactoryStock = processedFactoryStock.map((item: StockItem) => ({
        ...item,
        isNew: !!productionData.find((p: DailyProduction) => p.id === item.id),
      }));

      setFactoryStock(updatedFactoryStock);
      await setCachedData(CACHE_KEYS.FACTORY, updatedFactoryStock);

    } catch (err: any) {
      console.error('Error fetching stock data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh data and invalidate cache
  const refreshData = async () => {
    await invalidateCache(); // Invalidate all cache
    await fetchStockData(); // Fetch fresh data
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  return {
    factoryStock,
    godownStock,
    todaysProduction,
    isLoading,
    error,
    refreshData,
    allProducts
  };
} 