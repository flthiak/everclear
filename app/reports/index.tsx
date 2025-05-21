import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import { ChartBar, DollarSign, FileDown, Package, Share2, TrendingDown, TrendingUp, Truck, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';

// Interfaces for data types
interface SaleData {
  date: string;
  revenue: number;
  units_sold: number;
}

interface ProductSale {
  product_name: string;
  quantity: number;
  revenue: number;
  growth: number;
}

interface ReportMetric {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  color: string;
}

interface CustomerDistribution {
  type: string;
  count: number;
  color: string;
}

export default function ReportsScreen() {
  // State variables for UI controls
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [selectedChart, setSelectedChart] = useState<'revenue' | 'units'>('revenue');
  
  // State variables for data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSale[]>([]);
  const [customerDistribution, setCustomerDistribution] = useState<CustomerDistribution[]>([]);
  const [metrics, setMetrics] = useState<ReportMetric[]>([]);
  
  // Fetch data from supabase
  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);
  
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate date range based on selected period
      const today = new Date();
      let startDate = new Date();
      
      if (selectedPeriod === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === 'week') {
        startDate.setDate(today.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate.setMonth(today.getMonth() - 1);
      }
      
      const startDateStr = startDate.toISOString();
      
      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, product_id, quantity')
        .gte('created_at', startDateStr)
        .order('created_at');
      
      if (salesError) throw salesError;
      
      // Process sales data by date
      const salesByDate = processSalesByDate(salesData || []);
      setSalesData(salesByDate);
      
      // Fetch product data
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, factory_price, customer_price');
      
      if (productError) throw productError;
      
      // Process top products
      const topProductsData = processTopProducts(salesData || [], productData || []);
      setTopProducts(topProductsData);
      
      // Fetch customer distribution
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, type, created_at');
      
      if (customerError) throw customerError;
      
      // Process customer distribution
      const customerDist = processCustomerDistribution(customerData || []);
      setCustomerDistribution(customerDist);
      
      // Calculate metrics
      const metricsData = calculateMetrics(salesData || [], customerData || []);
      setMetrics(metricsData);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process sales data by date
  const processSalesByDate = (sales: any[]): SaleData[] => {
    const dateMap = new Map<string, { revenue: number, units_sold: number }>();
    
    sales.forEach(sale => {
      const date = new Date(sale.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { revenue: 0, units_sold: 0 });
      }
      
      const current = dateMap.get(date)!;
      dateMap.set(date, {
        revenue: current.revenue + (sale.total_amount || 0),
        units_sold: current.units_sold + (sale.quantity || 0)
      });
    });
    
    // Convert map to array and sort by date
    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      units_sold: data.units_sold
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  // Process top products
  const processTopProducts = (sales: any[], products: any[]): ProductSale[] => {
    // Create a map of product ID to sales data
    const productMap = new Map<string, { quantity: number, revenue: number }>();
    
    sales.forEach(sale => {
      const productId = sale.product_id;
      if (!productId) return;
      
      if (!productMap.has(productId)) {
        productMap.set(productId, { quantity: 0, revenue: 0 });
      }
      
      const current = productMap.get(productId)!;
      productMap.set(productId, {
        quantity: current.quantity + (sale.quantity || 0),
        revenue: current.revenue + (sale.total_amount || 0)
      });
    });
    
    // Convert map to array and join with product names
    const productSales = Array.from(productMap.entries()).map(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      return {
        product_name: product ? product.name : 'Unknown Product',
        quantity: data.quantity,
        revenue: data.revenue,
        growth: Math.floor(Math.random() * 30) - 10 // Placeholder for real growth calculation
      };
    });
    
    // Sort by revenue (descending) and take top 5
    return productSales.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  };
  
  // Process customer distribution
  const processCustomerDistribution = (customers: any[]): CustomerDistribution[] => {
    // Count customers by type
    const typeCounts = new Map<string, number>();
    
    customers.forEach(customer => {
      const type = customer.type || 'Unknown';
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
    
    // Define colors for each type
    const typeColors = {
      'Retail': '#4CAF50',
      'Wholesale': '#2196F3',
      'Distributor': '#FF9800',
      'Unknown': '#9E9E9E'
    };
    
    // Convert map to array
    return Array.from(typeCounts.entries()).map(([type, count]) => ({
      type,
      count,
      color: typeColors[type as keyof typeof typeColors] || '#9E9E9E'
    }));
  };
  
  // Calculate metrics
  const calculateMetrics = (sales: any[], customers: any[]): ReportMetric[] => {
    // Calculate total revenue
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    
    // Calculate total orders
    const totalOrders = sales.length;
    
    // Calculate active customers (customers with sales)
    const activeCustomers = new Set(sales.map(sale => sale.customer_id)).size;
    
    // Calculate delivery orders
    const deliveryOrders = sales.filter(sale => sale.delivery).length;
    
    return [
      {
        title: 'Total Revenue',
        value: `₹${totalRevenue.toLocaleString()}`,
        change: 12.5, // Placeholder for real calculation
        trend: 'up',
        icon: <DollarSign size={20} color="#4CAF50" />,
        color: '#4CAF50',
      },
      {
        title: 'Total Orders',
        value: totalOrders,
        change: 8.2, // Placeholder for real calculation
        trend: 'up',
        icon: <Package size={20} color="#2196F3" />,
        color: '#2196F3',
      },
      {
        title: 'Active Customers',
        value: activeCustomers,
        change: 2.4, // Placeholder for real calculation
        trend: 'up',
        icon: <Users size={20} color="#FF9800" />,
        color: '#FF9800',
      },
      {
        title: 'Deliveries',
        value: deliveryOrders,
        change: 15.8, // Placeholder for real calculation
        trend: 'up',
        icon: <Truck size={20} color="#9C27B0" />,
        color: '#9C27B0',
      },
    ];
  };
  
  // Prepare chart data
  const revenueData = {
    labels: salesData.map(item => item.date),
    datasets: [{
      data: salesData.map(item => item.revenue),
    }],
  };

  const unitData = {
    labels: topProducts.map(item => item.product_name),
    datasets: [{
      data: topProducts.map(item => item.quantity),
    }],
  };
  
  const pieData = customerDistribution.map(item => ({
    name: item.type,
    population: item.count,
    color: item.color,
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  // Loading screen
  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageTitleBar title="Reports" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B7BB0" />
          <Text style={styles.loadingText}>Loading dashboard data...</Text>
        </View>
      </View>
    );
  }

  // Error screen
  if (error) {
    return (
      <View style={styles.container}>
        <PageTitleBar title="Reports" showBack={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchDashboardData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageTitleBar title="Reports" showBack={true} />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <ChartBar size={24} color="#2B7BB0" />
          <Text style={styles.headerText}>Analytics Dashboard</Text>
        </View>

        <View style={styles.periodSelector}>
          <Pressable
            style={[styles.periodButton, selectedPeriod === 'day' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('day')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'day' && styles.periodButtonTextActive]}>
              Day
            </Text>
          </Pressable>
          <Pressable
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'week' && styles.periodButtonTextActive]}>
              Week
            </Text>
          </Pressable>
          <Pressable
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>
              Month
            </Text>
          </Pressable>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <View key={index} style={styles.metricCard}>
              <View style={styles.metricHeader}>
                {metric.icon}
                <Text style={styles.metricTitle}>{metric.title}</Text>
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <View style={[styles.metricTrend, { backgroundColor: `${metric.color}10` }]}>
                {metric.trend === 'up' ? (
                  <TrendingUp size={14} color={metric.color} />
                ) : (
                  <TrendingDown size={14} color={metric.color} />
                )}
                <Text style={[styles.metricChange, { color: metric.color }]}>
                  {metric.trend === 'up' ? '+' : ''}{metric.change}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sales Overview</Text>
            <View style={styles.chartToggle}>
              <Pressable
                style={[styles.toggleButton, selectedChart === 'revenue' && styles.toggleButtonActive]}
                onPress={() => setSelectedChart('revenue')}
              >
                <Text style={[styles.toggleButtonText, selectedChart === 'revenue' && styles.toggleButtonTextActive]}>
                  Revenue
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, selectedChart === 'units' && styles.toggleButtonActive]}
                onPress={() => setSelectedChart('units')}
              >
                <Text style={[styles.toggleButtonText, selectedChart === 'units' && styles.toggleButtonTextActive]}>
                  Units
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {selectedChart === 'revenue' ? (
              <LineChart
                data={revenueData}
                width={Dimensions.get('window').width - 48}
                height={220}
                yAxisLabel="₹"
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(43, 123, 176, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#fff',
                  },
                }}
                bezier
                style={styles.chart}
              />
            ) : (
              <BarChart
                data={unitData}
                width={Dimensions.get('window').width - 48}
                height={220}
                yAxisLabel=""
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                }}
                style={styles.chart}
              />
            )}
          </View>
          <Text style={styles.chartDescription}>
            {selectedChart === 'revenue' 
              ? `Sales revenue trend for the selected ${selectedPeriod}. The chart shows how revenue has changed over time.`
              : `Units sold by product for the selected ${selectedPeriod}. The chart shows the quantity of each product sold.`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Products</Text>
          <View style={styles.productsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.productCell]}>Product</Text>
              <Text style={[styles.headerCell, styles.quantityCell]}>Quantity</Text>
              <Text style={[styles.headerCell, styles.revenueCell]}>Revenue</Text>
              <Text style={[styles.headerCell, styles.growthCell]}>Growth</Text>
            </View>
            {topProducts.map((product, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.cell, styles.productCell]}>{product.product_name}</Text>
                <Text style={[styles.cell, styles.quantityCell]}>{product.quantity}</Text>
                <Text style={[styles.cell, styles.revenueCell]}>₹{product.revenue.toLocaleString()}</Text>
                <View style={[styles.growthIndicator, { backgroundColor: product.growth >= 0 ? '#e8f5e9' : '#ffebee' }]}>
                  {product.growth >= 0 ? (
                    <TrendingUp size={14} color="#4CAF50" />
                  ) : (
                    <TrendingDown size={14} color="#f44336" />
                  )}
                  <Text style={[styles.growthText, { color: product.growth >= 0 ? '#4CAF50' : '#f44336' }]}>
                    {product.growth >= 0 ? '+' : ''}{product.growth}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Distribution</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              width={Dimensions.get('window').width - 48}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
          <Text style={styles.chartDescription}>
            Distribution of customers by type. This helps to understand which customer segments contribute most to your business.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales Insights</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Revenue Growth</Text>
            <Text style={styles.insightText}>
              Your sales revenue has shown a positive trend over the past month with an average growth rate of 8.2%. The top-performing product is 500ml with the highest revenue contribution.
            </Text>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Customer Engagement</Text>
            <Text style={styles.insightText}>
              Your active customer base has increased by 12.5% in the past month. Retail customers make up the largest segment of your customer base, followed by wholesale customers.
            </Text>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Recommendations</Text>
            <Text style={styles.insightText}>
              Consider launching a loyalty program for retail customers to increase retention. Focus marketing efforts on 250ml bottles which have shown the highest growth potential in recent weeks.
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Pressable style={[styles.actionButton, styles.downloadButton]}>
            <FileDown size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Download Report</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.shareButton]}>
            <Share2 size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Share Report</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingBottom: 80,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'FiraSans_500Medium',
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'FiraSans_500Medium',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2B7BB0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'FiraSans_500Medium',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'FiraSans_600SemiBold',
    color: '#2B7BB0',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#2B7BB0',
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'FiraSans_500Medium',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 14,
    fontFamily: 'FiraSans_500Medium',
    color: '#666',
  },
  metricValue: {
    fontSize: 24,
    fontFamily: 'FiraSans_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  metricChange: {
    fontSize: 12,
    fontFamily: 'FiraSans_600SemiBold',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'FiraSans_600SemiBold',
    color: '#333',
  },
  chartToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f6fa',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#2B7BB0',
  },
  toggleButtonText: {
    fontSize: 13,
    fontFamily: 'FiraSans_500Medium',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartDescription: {
    fontSize: 13,
    fontFamily: 'FiraSans_400Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  productsTable: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    fontSize: 13,
    fontFamily: 'FiraSans_600SemiBold',
    color: '#666',
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cell: {
    fontSize: 13,
    fontFamily: 'FiraSans_400Regular',
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  productCell: {
    flex: 2,
    textAlign: 'left',
  },
  quantityCell: {
    flex: 1.5,
    textAlign: 'center',
  },
  revenueCell: {
    flex: 1.5,
    textAlign: 'right',
  },
  growthCell: {
    flex: 1.5,
    textAlign: 'center',
  },
  growthIndicator: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginHorizontal: 12,
  },
  growthText: {
    fontSize: 12,
    fontFamily: 'FiraSans_600SemiBold',
  },
  insightCard: {
    backgroundColor: '#f5f6fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: 'FiraSans_600SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'FiraSans_400Regular',
    color: '#666',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 60,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadButton: {
    backgroundColor: '#4CAF50',
  },
  shareButton: {
    backgroundColor: '#2B7BB0',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'FiraSans_600SemiBold',
  },
});