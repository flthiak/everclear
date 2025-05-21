import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { ChevronDown, Calendar, Search, ListFilter as Filter, ArrowDownUp, Download, Share2 } from 'lucide-react-native';
import PageTitleBar from '@/components/PageTitleBar';
import DatePicker from '@/components/DatePicker';

// Define types for our data
interface SaleData {
  date: string;
  revenue: number;
  orders: number;
}

interface ProductSale {
  product_name: string;
  quantity: number;
  revenue: number;
}

interface CustomerSale {
  customer_name: string;
  orders: number;
  revenue: number;
}

interface PaymentMethodData {
  method: string;
  count: number;
  amount: number;
}

export default function SalesReportScreen() {
  // State variables
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data state
  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSale[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerSale[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);
  
  // Fetch data on component mount and when time range changes
  useEffect(() => {
    fetchSalesData();
  }, [timeRange]);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSalesData();
    setRefreshing(false);
  };
  
  // Calculate date range based on selected time period
  const getDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    switch (timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }
    
    return { start, end };
  };
  
  // Fetch sales data from Supabase
  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get date range
      const { start, end } = timeRange === 'custom' 
        ? { start: startDate, end: endDate } 
        : getDateRange();
      
      // Format dates for query
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      
      console.log(`Fetching sales data from ${startStr} to ${endStr}`);
      
      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, customer_id, payment_method, status')
        .gte('created_at', startStr)
        .lte('created_at', endStr)
        .order('created_at');
      
      if (salesError) throw salesError;
      
      // Process sales data
      processSalesData(salesData || []);
      
      // Fetch sale items for product analysis
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          id, 
          sale_id, 
          product_id, 
          quantity, 
          price, 
          total_price,
          products (
            id, 
            product_name
          )
        `)
        .in('sale_id', salesData?.map(sale => sale.id) || []);
      
      if (itemsError) throw itemsError;
      
      // Process product sales data
      processProductData(saleItems || []);
      
      // Fetch customer data
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', salesData?.map(sale => sale.customer_id).filter(id => id) || []);
      
      if (customersError) throw customersError;
      
      // Process customer sales data
      processCustomerData(salesData || [], customers || []);
      
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError('Failed to load sales data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Process sales data for charts and metrics
  const processSalesData = (data: any[]) => {
    // Group sales by date
    const salesByDate = data.reduce((acc: {[key: string]: {revenue: number, orders: number}}, sale) => {
      const date = new Date(sale.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!acc[date]) {
        acc[date] = { revenue: 0, orders: 0 };
      }
      
      acc[date].revenue += Number(sale.total_amount) || 0;
      acc[date].orders += 1;
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    const salesArray = Object.entries(salesByDate).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders
    })).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    setSalesData(salesArray);
    
    // Calculate totals
    const totalRev = data.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
    const totalOrd = data.length;
    const avgOrder = totalOrd > 0 ? totalRev / totalOrd : 0;
    
    setTotalRevenue(totalRev);
    setTotalOrders(totalOrd);
    setAverageOrderValue(avgOrder);
    
    // Process payment methods
    const paymentMethodsMap = data.reduce((acc: {[key: string]: {count: number, amount: number}}, sale) => {
      const method = sale.payment_method || 'Unknown';
      
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 };
      }
      
      acc[method].count += 1;
      acc[method].amount += Number(sale.total_amount) || 0;
      
      return acc;
    }, {});
    
    const paymentMethodsArray = Object.entries(paymentMethodsMap).map(([method, data]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      count: data.count,
      amount: data.amount
    }));
    
    setPaymentMethods(paymentMethodsArray);
  };
  
  // Process product sales data
  const processProductData = (data: any[]) => {
    // Group by product
    const productMap = data.reduce((acc: {[key: string]: {quantity: number, revenue: number}}, item) => {
      const productName = item.products?.product_name || `Product #${item.product_id?.slice(-4) || '0000'}`;
      
      if (!acc[productName]) {
        acc[productName] = { quantity: 0, revenue: 0 };
      }
      
      acc[productName].quantity += Number(item.quantity) || 0;
      acc[productName].revenue += Number(item.total_price) || (Number(item.price) * Number(item.quantity)) || 0;
      
      return acc;
    }, {});
    
    // Convert to array and sort by revenue
    const productsArray = Object.entries(productMap).map(([product_name, data]) => ({
      product_name,
      quantity: data.quantity,
      revenue: data.revenue
    })).sort((a, b) => b.revenue - a.revenue);
    
    setTopProducts(productsArray.slice(0, 5));
  };
  
  // Process customer sales data
  const processCustomerData = (salesData: any[], customersData: any[]) => {
    // Create customer map for quick lookup
    const customerMap = new Map();
    customersData.forEach(customer => {
      customerMap.set(customer.id, customer.name);
    });
    
    // Group by customer
    const customerSalesMap = salesData.reduce((acc: {[key: string]: {orders: number, revenue: number}}, sale) => {
      if (!sale.customer_id) return acc;
      
      const customerName = customerMap.get(sale.customer_id) || 'Unknown Customer';
      
      if (!acc[customerName]) {
        acc[customerName] = { orders: 0, revenue: 0 };
      }
      
      acc[customerName].orders += 1;
      acc[customerName].revenue += Number(sale.total_amount) || 0;
      
      return acc;
    }, {});
    
    // Convert to array and sort by revenue
    const customersArray = Object.entries(customerSalesMap).map(([customer_name, data]) => ({
      customer_name,
      orders: data.orders,
      revenue: data.revenue
    })).sort((a, b) => b.revenue - a.revenue);
    
    setTopCustomers(customersArray.slice(0, 5));
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', {
      maximumFractionDigits: 0
    })}`;
  };
  
  // Prepare chart data
  const revenueChartData = {
    labels: salesData.map(item => item.date),
    datasets: [{
      data: salesData.map(item => item.revenue),
      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
      strokeWidth: 2
    }],
    legend: ["Revenue"]
  };
  
  const ordersChartData = {
    labels: salesData.map(item => item.date),
    datasets: [{
      data: salesData.map(item => item.orders),
      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
      strokeWidth: 2
    }],
    legend: ["Orders"]
  };
  
  const paymentMethodsChartData = {
    labels: paymentMethods.map(item => item.method),
    datasets: [{
      data: paymentMethods.map(item => item.amount),
    }],
  };
  
  const productsPieData = topProducts.map((item, index) => {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
    return {
      name: item.product_name.length > 10 ? item.product_name.substring(0, 10) + '...' : item.product_name,
      population: item.revenue,
      color: colors[index % colors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    };
  });
  
  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726'
    }
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <PageTitleBar title="Sales Report" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B7BB0" />
          <Text style={styles.loadingText}>Loading sales data...</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <PageTitleBar title="Sales Report" showBack={true} />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'today' && styles.activeTimeRange]}
            onPress={() => setTimeRange('today')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'today' && styles.activeTimeRangeText]}>Today</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'week' && styles.activeTimeRange]}
            onPress={() => setTimeRange('week')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'week' && styles.activeTimeRangeText]}>Week</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'month' && styles.activeTimeRange]}
            onPress={() => setTimeRange('month')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'month' && styles.activeTimeRangeText]}>Month</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'year' && styles.activeTimeRange]}
            onPress={() => setTimeRange('year')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'year' && styles.activeTimeRangeText]}>Year</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.customDateButton}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Calendar size={16} color="#2B7BB0" />
            <Text style={styles.customDateText}>Custom</Text>
          </TouchableOpacity>
        </View>
        
        {/* Custom Date Picker */}
        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerRow}>
              <Text style={styles.datePickerLabel}>Start Date:</Text>
              <DatePicker
                value={startDate}
                onChange={(date) => date && setStartDate(date)}
              />
            </View>
            
            <View style={styles.datePickerRow}>
              <Text style={styles.datePickerLabel}>End Date:</Text>
              <DatePicker
                value={endDate}
                onChange={(date) => date && setEndDate(date)}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => {
                setTimeRange('custom');
                setShowDatePicker(false);
                fetchSalesData();
              }}
            >
              <Text style={styles.applyButtonText}>Apply Date Range</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSalesData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Orders</Text>
            <Text style={styles.summaryValue}>{totalOrders}</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg. Order Value</Text>
            <Text style={styles.summaryValue}>{formatCurrency(averageOrderValue)}</Text>
          </View>
        </View>
        
        {/* Revenue Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue Trend</Text>
          {salesData.length > 0 ? (
            <LineChart
              data={revenueChartData}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisLabel="₹"
              yAxisSuffix=""
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No revenue data available for the selected period</Text>
            </View>
          )}
        </View>
        
        {/* Orders Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Orders Trend</Text>
          {salesData.length > 0 ? (
            <LineChart
              data={ordersChartData}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No orders data available for the selected period</Text>
            </View>
          )}
        </View>
        
        {/* Payment Methods Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Payment Methods</Text>
          {paymentMethods.length > 0 ? (
            <BarChart
              data={paymentMethodsChartData}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`
              }}
              style={styles.chart}
              verticalLabelRotation={30}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No payment method data available</Text>
            </View>
          )}
        </View>
        
        {/* Top Products */}
        <View style={styles.tableCard}>
          <Text style={styles.chartTitle}>Top Products</Text>
          {topProducts.length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.productCell]}>Product</Text>
                <Text style={[styles.headerCell, styles.quantityCell]}>Quantity</Text>
                <Text style={[styles.headerCell, styles.revenueCell]}>Revenue</Text>
              </View>
              
              {topProducts.map((product, index) => (
                <View key={index} style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.alternateRow
                ]}>
                  <Text style={[styles.cell, styles.productCell]} numberOfLines={1} ellipsizeMode="tail">
                    {product.product_name}
                  </Text>
                  <Text style={[styles.cell, styles.quantityCell]}>{product.quantity}</Text>
                  <Text style={[styles.cell, styles.revenueCell]}>{formatCurrency(product.revenue)}</Text>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No product data available</Text>
            </View>
          )}
        </View>
        
        {/* Top Customers */}
        <View style={styles.tableCard}>
          <Text style={styles.chartTitle}>Top Customers</Text>
          {topCustomers.length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.customerCell]}>Customer</Text>
                <Text style={[styles.headerCell, styles.ordersCell]}>Orders</Text>
                <Text style={[styles.headerCell, styles.revenueCell]}>Revenue</Text>
              </View>
              
              {topCustomers.map((customer, index) => (
                <View key={index} style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.alternateRow
                ]}>
                  <Text style={[styles.cell, styles.customerCell]} numberOfLines={1} ellipsizeMode="tail">
                    {customer.customer_name}
                  </Text>
                  <Text style={[styles.cell, styles.ordersCell]}>{customer.orders}</Text>
                  <Text style={[styles.cell, styles.revenueCell]}>{formatCurrency(customer.revenue)}</Text>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No customer data available</Text>
            </View>
          )}
        </View>
        
        {/* Product Distribution */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Product Revenue Distribution</Text>
          {topProducts.length > 0 ? (
            <PieChart
              data={productsPieData}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No product distribution data available</Text>
            </View>
          )}
        </View>
        
        {/* Export Buttons */}
        <View style={styles.exportContainer}>
          <TouchableOpacity style={styles.exportButton}>
            <Download size={16} color="#fff" />
            <Text style={styles.exportButtonText}>Download Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareButton}>
            <Share2 size={16} color="#fff" />
            <Text style={styles.shareButtonText}>Share Report</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTimeRange: {
    backgroundColor: '#2B7BB0',
    borderRadius: 8,
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  activeTimeRangeText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  customDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
  },
  customDateText: {
    fontSize: 14,
    color: '#2B7BB0',
    marginLeft: 4,
    fontFamily: 'AsapCondensed_400Regular',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  applyButton: {
    backgroundColor: '#2B7BB0',
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B7BB0',
    fontFamily: 'AsapCondensed_400Regular',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  alternateRow: {
    backgroundColor: '#f9f9f9',
  },
  cell: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  productCell: {
    flex: 2,
  },
  quantityCell: {
    flex: 1,
    textAlign: 'center',
  },
  revenueCell: {
    flex: 1,
    textAlign: 'right',
  },
  customerCell: {
    flex: 2,
  },
  ordersCell: {
    flex: 1,
    textAlign: 'center',
  },
  exportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2B7BB0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
});