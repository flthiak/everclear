import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { supabase } from '@/lib/supabase';

interface TrendData {
  label: string;
  factory: number;
  godown: number;
}

const InventoryTrend = () => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  
  useEffect(() => {
    fetchTopInventoryItems();
  }, []);
  
  const fetchTopInventoryItems = async () => {
    try {
      setLoading(true);
      
      // Fetch top 5 products by total quantity across both locations
      const { data: factoryData, error: factoryError } = await supabase
        .from('factory_stock')
        .select(`
          quantity,
          product:products (
            product_name
          )
        `)
        .order('quantity', { ascending: false })
        .limit(10);
        
      if (factoryError) throw factoryError;
      
      const { data: godownData, error: godownError } = await supabase
        .from('godown_stock')
        .select(`
          quantity,
          product:products (
            product_name
          )
        `)
        .order('quantity', { ascending: false })
        .limit(10);
        
      if (godownError) throw godownError;
      
      // Combine and process data
      const combinedData = new Map<string, TrendData>();
      
      // Process factory data
      factoryData.forEach((item: any) => {
        const productName = item.product.product_name;
        if (combinedData.has(productName)) {
          const existing = combinedData.get(productName)!;
          existing.factory = item.quantity;
        } else {
          combinedData.set(productName, {
            label: productName,
            factory: item.quantity,
            godown: 0
          });
        }
      });
      
      // Process godown data
      godownData.forEach((item: any) => {
        const productName = item.product.product_name;
        if (combinedData.has(productName)) {
          const existing = combinedData.get(productName)!;
          existing.godown = item.quantity;
        } else {
          combinedData.set(productName, {
            label: productName,
            factory: 0,
            godown: item.quantity
          });
        }
      });
      
      // Convert to array and sort by total quantity
      const dataArray = Array.from(combinedData.values())
        .sort((a, b) => (b.factory + b.godown) - (a.factory + a.godown))
        .slice(0, 5); // Take top 5
        
      setTrendData(dataArray);
    } catch (error) {
      console.error('Error fetching inventory trends:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2B7BB0" />
        <Text style={styles.loadingText}>Loading trend data...</Text>
      </View>
    );
  }
  
  if (trendData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Top Inventory Items</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No trend data available</Text>
        </View>
      </View>
    );
  }
  
  // Prepare data for chart
  const chartData = {
    labels: trendData.map(item => {
      // Truncate long product names
      const maxLength = 10;
      return item.label.length > maxLength 
        ? item.label.substring(0, maxLength) + '...' 
        : item.label;
    }),
    datasets: [
      {
        data: trendData.map(item => item.factory),
        color: (opacity = 1) => `rgba(43, 123, 176, ${opacity})`,
        stackable: true,
      },
      {
        data: trendData.map(item => item.godown),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        stackable: true,
      }
    ],
  };
  
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top Inventory Items</Text>
      <View style={styles.chartContainer}>
        <BarChart
          data={chartData}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          fromZero
          showValuesOnTopOfBars
          withInnerLines={false}
          yAxisLabel=""
          yAxisSuffix=""
          segments={4}
        />
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.factoryColor]} />
            <Text style={styles.legendText}>Factory</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.godownColor]} />
            <Text style={styles.legendText}>Godown</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  factoryColor: {
    backgroundColor: 'rgba(43, 123, 176, 1)',
  },
  godownColor: {
    backgroundColor: 'rgba(76, 175, 80, 1)',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 16,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
});

export default InventoryTrend; 