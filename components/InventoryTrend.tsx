import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { supabase } from '@/lib/supabase';
import { BarChart2, TrendingUp, Calendar } from 'lucide-react-native';

interface TrendData {
  label: string;
  factory: number;
  godown: number;
}

const InventoryTrend = () => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  
  useEffect(() => {
    fetchTopInventoryItems();
  }, [period]);
  
  const fetchTopInventoryItems = async () => {
    try {
      setLoading(true);
      
      // Fetch top 5 products by total quantity across both locations
      const { data: factoryData, error: factoryError } = await supabase
        .from('factory_stock')
        .select(`
          quantity,
          product_name,
          product_sn,
          products (
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
          product_name,
          product_sn,
          products (
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
        const productName = item.product_name || (item.products?.product_name || 'Unknown');
        // Simplify product names for better display
        let displayName = productName;
        if (displayName.includes('250ml')) displayName = '250ml';
        else if (displayName.includes('500ml')) displayName = '500ml';
        else if (displayName.includes('1000ml') || displayName.includes('1L')) displayName = '1L';
        else if (displayName.length > 10) displayName = displayName.substring(0, 10) + '...';
        
        if (combinedData.has(displayName)) {
          const existing = combinedData.get(displayName)!;
          existing.factory = item.quantity;
        } else {
          combinedData.set(displayName, {
            label: displayName,
            factory: item.quantity,
            godown: 0
          });
        }
      });
      
      // Process godown data
      godownData.forEach((item: any) => {
        const productName = item.product_name || (item.products?.product_name || 'Unknown');
        // Simplify product names for better display
        let displayName = productName;
        if (displayName.includes('250ml')) displayName = '250ml';
        else if (displayName.includes('500ml')) displayName = '500ml';
        else if (displayName.includes('1000ml') || displayName.includes('1L')) displayName = '1L';
        else if (displayName.length > 10) displayName = displayName.substring(0, 10) + '...';
        
        if (combinedData.has(displayName)) {
          const existing = combinedData.get(displayName)!;
          existing.godown = item.quantity;
        } else {
          combinedData.set(displayName, {
            label: displayName,
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
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <BarChart2 size={18} color="#333" />
            <Text style={styles.title}>Top Inventory Items</Text>
          </View>
          <View style={styles.periodToggle}>
            <TouchableOpacity
              style={[styles.periodButton, period === 'week' && styles.activePeriodButton]}
              onPress={() => setPeriod('week')}
            >
              <Text style={[styles.periodButtonText, period === 'week' && styles.activePeriodButtonText]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, period === 'month' && styles.activePeriodButton]}
              onPress={() => setPeriod('month')}
            >
              <Text style={[styles.periodButtonText, period === 'month' && styles.activePeriodButtonText]}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No trend data available</Text>
        </View>
      </View>
    );
  }
  
  // Prepare data for chart
  const chartData = {
    labels: trendData.map(item => item.label),
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
    legend: ["Factory", "Godown"]
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
    },
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <BarChart2 size={18} color="#333" />
          <Text style={styles.title}>Top Inventory Items</Text>
        </View>
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.periodButton, period === 'week' && styles.activePeriodButton]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.periodButtonText, period === 'week' && styles.activePeriodButtonText]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, period === 'month' && styles.activePeriodButton]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.periodButtonText, period === 'month' && styles.activePeriodButtonText]}>Month</Text>
          </TouchableOpacity>
        </View>
      </View>
      
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
      </View>
      
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
      
      <View style={styles.insightContainer}>
        <TrendingUp size={16} color="#4CAF50" />
        <Text style={styles.insightText}>
          {period === 'week' ? 'Weekly' : 'Monthly'} inventory distribution across locations
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  activePeriodButton: {
    backgroundColor: '#2B7BB0',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  activePeriodButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
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
    fontFamily: 'AsapCondensed_400Regular',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  insightText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
});

export default InventoryTrend;