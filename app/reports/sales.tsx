import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

// Types and interfaces
interface SalesData {
  id: string;
  date: string;
  total: number;
  customer_name: string;
  payment_method: string;
  products: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    category?: string;
  }[];
  created_at?: string;
}

interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: {id: string, name: string, quantity: number, revenue: number}[];
  topCustomers: {id: string, name: string, orders: number, revenue: number}[];
  salesByDay: {date: string, revenue: number, orders: number}[];
  salesByPaymentMethod: {method: string, count: number, total: number}[];
  salesByProductCategory: {category: string, count: number, total: number}[];
}

type TimeRange = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';
type ChartType = 'daily' | 'weekly' | 'monthly';
type ComparisonType = 'previousPeriod' | 'sameLastYear' | 'none';

// Custom components to replace react-native-paper
const Card = ({ children, style }: { children: React.ReactNode, style?: any }) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

const CardContent = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.cardContent}>
    {children}
  </View>
);

const Button = ({ 
  onPress, 
  children, 
  mode, 
  style 
}: { 
  onPress: () => void, 
  children: React.ReactNode, 
  mode?: string, 
  style?: any 
}) => (
  <TouchableOpacity 
    onPress={onPress} 
    style={[
      styles.button,
      mode === 'contained' ? styles.buttonContained : styles.buttonOutlined,
      style
    ]}
  >
    <Text style={mode === 'contained' ? styles.buttonTextContained : styles.buttonTextOutlined}>
      {children}
    </Text>
  </TouchableOpacity>
);

const Divider = () => <View style={styles.divider} />;

const DataTableHeader = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.tableHeader}>
    {children}
  </View>
);

const DataTableRow = ({ children, key }: { children: React.ReactNode, key?: string }) => (
  <View style={styles.tableRow} key={key}>
    {children}
  </View>
);

const DataTableCell = ({ children, numeric }: { children: React.ReactNode, numeric?: boolean }) => (
  <View style={[styles.tableCell, numeric ? styles.tableCellRight : null]}>
    <Text style={numeric ? styles.tableCellTextRight : styles.tableCellText}>{children}</Text>
  </View>
);

const DataTableTitle = ({ children, numeric }: { children: React.ReactNode, numeric?: boolean }) => (
  <View style={[styles.tableCell, numeric ? styles.tableCellRight : null]}>
    <Text style={[styles.tableHeaderText, numeric ? styles.tableCellTextRight : null]}>{children}</Text>
  </View>
);

const DataTable = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.table}>
    {children}
  </View>
);

export default function SalesReportScreen() {
  // Filter states
  const [timeRange, setTimeRange] = useState<TimeRange>('thisMonth');
  const [startDate, setStartDate] = useState<Date>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [chartType, setChartType] = useState<ChartType>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [filteredData, setFilteredData] = useState<SalesData[]>([]);
  const [summary, setSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    topProducts: [],
    topCustomers: [],
    salesByDay: [],
    salesByPaymentMethod: [],
    salesByProductCategory: []
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'products' | 'customers'>('overview');
  
  // Helper function to get default start date
  function getDefaultStartDate(): Date {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDayOfMonth;
  }

  // Format currency helper
  const formatCurrency = (amount: number | undefined | null): string => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `₹${safeAmount.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    })}`;
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  // Fetch data helper
  const fetchSalesData = async () => {
    setLoading(true);
    try {
      // Create date range for query
      let startDateISO, endDateISO;
      
      if (timeRange === 'today') {
      const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDateISO = today.toISOString();
        endDateISO = new Date().toISOString();
      } else if (timeRange === 'thisWeek') {
        const today = new Date();
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay());
        firstDayOfWeek.setHours(0, 0, 0, 0);
        startDateISO = firstDayOfWeek.toISOString();
        endDateISO = new Date().toISOString();
      } else if (timeRange === 'thisMonth') {
        const firstDayOfMonth = getDefaultStartDate();
        startDateISO = firstDayOfMonth.toISOString();
        endDateISO = new Date().toISOString();
      } else if (timeRange === 'custom') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        startDateISO = startDate.toISOString();
        endDateISO = endDate.toISOString();
      }
      
      // Query sales from Supabase
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Fetch product details for each sale
        const salesWithProducts = await Promise.all(
          data.map(async (sale) => {
            const { data: products, error: productsError } = await supabase
        .from('sale_items')
              .select('*, product:product_id(id, name, category)')
              .eq('sale_id', sale.id);
            
            if (productsError) {
              console.error('Error fetching products:', productsError);
              return {
                ...sale,
                products: []
              };
            }
            
            // Transform product data structure
            const formattedProducts = products?.map(item => ({
              id: item.product?.id || '',
              name: item.product?.name || 'Unknown',
              quantity: item.quantity || 0,
              price: item.price || 0,
              total: (item.quantity || 0) * (item.price || 0),
              category: item.product?.category || 'Uncategorized'
            })) || [];
            
            return {
              id: sale.id,
              date: sale.created_at,
              total: Number(sale.total_amount) || 0,
              customer_name: sale.customer_name || 'Walk-in Customer',
              payment_method: sale.payment_method || 'Cash',
              products: formattedProducts
            };
          })
        );
        
        setSalesData(salesWithProducts);
        setFilteredData(salesWithProducts);
        
        // Calculate summary data
        calculateSummary(salesWithProducts);
      }
    } catch (error) {
      console.error("Error fetching sales data:", error);
      // Set empty data with default values to avoid breaking the UI
      setSalesData([]);
      setFilteredData([]);
      setSummary({
        totalSales: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        topProducts: [],
        topCustomers: [],
        salesByDay: [],
        salesByPaymentMethod: [],
        salesByProductCategory: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate summary from sales data
  const calculateSummary = (sales: SalesData[]) => {
    console.log('Sales data for summary:', sales);
    // Total sales and revenue
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Process products
    const productsMap = new Map();
    const customersMap = new Map();
    const paymentMethodsMap = new Map();
    const categoryMap = new Map();
    const dailySalesMap = new Map();
    
    sales.forEach(sale => {
      // Track payment methods
      const method = sale.payment_method;
      if (!paymentMethodsMap.has(method)) {
        paymentMethodsMap.set(method, { count: 0, total: 0 });
      }
      const methodData = paymentMethodsMap.get(method);
      methodData.count += 1;
      methodData.total += sale.total;
      
      // Track customers
      const customer = sale.customer_name;
      if (!customersMap.has(customer)) {
        customersMap.set(customer, { id: customer, name: customer, orders: 0, revenue: 0 });
      }
      const customerData = customersMap.get(customer);
      customerData.orders += 1;
      customerData.revenue += sale.total;
      
      // Track daily sales
      const dateStr = formatDateForDisplay(sale.date || sale.created_at || '');
      if (!dailySalesMap.has(dateStr)) {
        dailySalesMap.set(dateStr, { date: dateStr, revenue: 0, orders: 0 });
      }
      const dayData = dailySalesMap.get(dateStr);
      dayData.orders += 1;
      dayData.revenue += sale.total;
      
      // Track products
      sale.products.forEach(product => {
        if (!productsMap.has(product.id)) {
          productsMap.set(product.id, { 
            id: product.id, 
            name: product.name, 
            quantity: 0, 
            revenue: 0 
          });
        }
        const productData = productsMap.get(product.id);
        productData.quantity += product.quantity;
        productData.revenue += product.total;
        
        // Track categories
        const category = product.category || 'Uncategorized';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { category, count: 0, total: 0 });
        }
        const categoryData = categoryMap.get(category);
        categoryData.count += product.quantity;
        categoryData.total += product.total;
      });
    });
    
    // Sort and limit data for display
    const topProducts = Array.from(productsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
      
    const topCustomers = Array.from(customersMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
      
    const salesByDay = Array.from(dailySalesMap.values())
      .map(day => ({
        ...day,
        revenue: Number(day.revenue) || 0
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
    const salesByPaymentMethod = Array.from(paymentMethodsMap.entries())
      .map(([method, data]) => ({ method, count: data.count, total: data.total }));
      
    const salesByProductCategory = Array.from(categoryMap.values());
    
    // Update summary state
    setSummary({
      totalSales,
      totalRevenue,
      averageOrderValue,
      topProducts,
      topCustomers,
      salesByDay,
      salesByPaymentMethod,
      salesByProductCategory
    });
  };

  // Effect for initial data loading
  useEffect(() => {
    fetchSalesData();
  }, []);
  
  // Effect to refresh data when filters change
  useEffect(() => {
    if (!loading) {
      fetchSalesData();
    }
  }, [timeRange, startDate, endDate]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSalesData();
  };

  const applyFilters = () => {
    if (searchQuery.trim() === '') {
      setFilteredData(salesData);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = salesData.filter(sale => 
        sale.customer_name.toLowerCase().includes(query) ||
        sale.products.some(product => product.name.toLowerCase().includes(query))
      );
      setFilteredData(filtered);
    }
    setShowFilters(false);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header and filters */}
        <View style={styles.header}>
        <Text style={styles.title}>Sales Report</Text>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={24} color="#3498db" />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
        </View>

      {/* Loading indicator */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading sales data...</Text>
        </View>
      )}

      {!loading && (
        <>
          {/* Filter section */}
          {showFilters && (
            <Card style={styles.filterCard}>
              <CardContent>
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Time Range:</Text>
                  <View style={styles.buttonGroup}>
                    {['today', 'thisWeek', 'thisMonth', 'custom'].map((range) => (
                      <TouchableOpacity
                        key={range}
                        style={[
                          styles.filterChip,
                          timeRange === range && styles.filterChipActive
                        ]}
                        onPress={() => setTimeRange(range as TimeRange)}
                      >
                        <Text style={timeRange === range ? styles.filterChipTextActive : styles.filterChipText}>
                          {range === 'today' ? 'Today' : 
                           range === 'thisWeek' ? 'This Week' : 
                           range === 'thisMonth' ? 'This Month' : 'Custom'}
            </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
        </View>

                {timeRange === 'custom' && (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerRow}>
                      <Text style={styles.filterLabel}>Start Date:</Text>
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => date && setStartDate(date)}
                      />
              </View>
                    <View style={styles.datePickerRow}>
                      <Text style={styles.filterLabel}>End Date:</Text>
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => date && setEndDate(date)}
                      />
              </View>
            </View>
                )}

                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Search:</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by product or customer"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
        </View>

                <Button 
                  mode="contained" 
                  onPress={applyFilters}
                  style={styles.applyButton}
                >
                  Apply Filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <Card style={styles.summaryCard}>
              <CardContent>
                <Text style={styles.summaryLabel}>Total Sales</Text>
                <Text style={styles.summaryValue}>{summary.totalSales}</Text>
              </CardContent>
            </Card>

            <Card style={styles.summaryCard}>
              <CardContent>
                <Text style={styles.summaryLabel}>Revenue</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</Text>
              </CardContent>
            </Card>

            <Card style={styles.summaryCard}>
              <CardContent>
                <Text style={styles.summaryLabel}>Avg. Order</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.averageOrderValue)}</Text>
              </CardContent>
            </Card>
            </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            {['overview', 'sales', 'products', 'customers'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && styles.activeTab
                ]}
                onPress={() => setActiveTab(tab as any)}
              >
                <Text style={activeTab === tab ? styles.activeTabText : styles.tabText}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'overview' && (
              <View>
                <Text style={styles.sectionTitle}>Sales Trend</Text>
                {summary.salesByDay.length > 0 ? (
          <View style={styles.chartContainer}>
            <LineChart
                      data={{
                        labels: summary.salesByDay.map(day => day.date),
                        datasets: [
                          {
                            data: summary.salesByDay.map(day => Number(day.revenue) || 0),
                            color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                            strokeWidth: 2
                          }
                        ],
                        legend: ["Revenue"]
                      }}
                      width={Dimensions.get("window").width - 64}
                      height={180}
              chartConfig={{
                        backgroundColor: "#ffffff",
                        backgroundGradientFrom: "#ffffff",
                        backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                          borderRadius: 16
                        }
              }}
              bezier
                      style={{
                        marginVertical: 8,
                        borderRadius: 16
                      }}
              />
            </View>
          ) : (
                  <Text style={styles.emptyText}>No data available</Text>
                )}
                
                <Divider />
                
                <Text style={styles.sectionTitle}>Payment Methods</Text>
                {summary.salesByPaymentMethod.length > 0 ? (
                  <View>
              <BarChart
                      data={{
                        labels: summary.salesByPaymentMethod.map(method => method.method),
                        datasets: [
                          {
                            data: summary.salesByPaymentMethod.map(method => method.total),
                          }
                        ]
                      }}
                      width={Dimensions.get("window").width - 64}
                      height={180}
                      yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={{
                        backgroundColor: "#ffffff",
                        backgroundGradientFrom: "#ffffff",
                        backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                          borderRadius: 16
                        }
                      }}
                      style={{
                        marginVertical: 8,
                        borderRadius: 16
                      }}
                    />
                    
                    <DataTable>
                      <DataTableHeader>
                        <DataTableTitle>Method</DataTableTitle>
                        <DataTableTitle numeric>Orders</DataTableTitle>
                        <DataTableTitle numeric>Amount</DataTableTitle>
                      </DataTableHeader>
                      
                      {summary.salesByPaymentMethod.map((item, index) => (
                        <DataTableRow key={index.toString()}>
                          <DataTableCell>{item.method}</DataTableCell>
                          <DataTableCell numeric>{item.count}</DataTableCell>
                          <DataTableCell numeric>{formatCurrency(item.total)}</DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTable>
            </View>
          ) : (
                  <Text style={styles.emptyText}>No payment data available</Text>
          )}
        </View>
            )}
            
            {activeTab === 'sales' && (
              <View>
                <Text style={styles.sectionTitle}>Sales List</Text>
                {filteredData.length > 0 ? (
                  <DataTable>
                    <DataTableHeader>
                      <DataTableTitle>Date</DataTableTitle>
                      <DataTableTitle>Customer</DataTableTitle>
                      <DataTableTitle numeric>Amount</DataTableTitle>
                    </DataTableHeader>
                    
                    {filteredData.map((sale) => (
                      <DataTableRow key={sale.id}>
                        <DataTableCell>{formatDateForDisplay(sale.date)}</DataTableCell>
                        <DataTableCell>{sale.customer_name}</DataTableCell>
                        <DataTableCell numeric>{formatCurrency(sale.total)}</DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTable>
                ) : (
                  <Text style={styles.emptyText}>No sales data available</Text>
                )}
              </View>
            )}
            
            {activeTab === 'products' && (
              <View>
                <Text style={styles.sectionTitle}>Top Products</Text>
                {summary.topProducts.length > 0 ? (
                  <DataTable>
                    <DataTableHeader>
                      <DataTableTitle>Product</DataTableTitle>
                      <DataTableTitle numeric>Qty Sold</DataTableTitle>
                      <DataTableTitle numeric>Revenue</DataTableTitle>
                    </DataTableHeader>
                    
                    {summary.topProducts.map((product) => (
                      <DataTableRow key={product.id}>
                        <DataTableCell>{product.name}</DataTableCell>
                        <DataTableCell numeric>{product.quantity}</DataTableCell>
                        <DataTableCell numeric>{formatCurrency(product.revenue)}</DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTable>
                ) : (
                  <Text style={styles.emptyText}>No product data available</Text>
                )}
            </View>
            )}
            
            {activeTab === 'customers' && (
              <View>
                <Text style={styles.sectionTitle}>Top Customers</Text>
                {summary.topCustomers.length > 0 ? (
                  <DataTable>
                    <DataTableHeader>
                      <DataTableTitle>Customer</DataTableTitle>
                      <DataTableTitle numeric>Orders</DataTableTitle>
                      <DataTableTitle numeric>Spent</DataTableTitle>
                    </DataTableHeader>
                    
                    {summary.topCustomers.map((customer) => (
                      <DataTableRow key={customer.id}>
                        <DataTableCell>{customer.name}</DataTableCell>
                        <DataTableCell numeric>{customer.orders}</DataTableCell>
                        <DataTableCell numeric>{formatCurrency(customer.revenue)}</DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTable>
                ) : (
                  <Text style={styles.emptyText}>No customer data available</Text>
                )}
            </View>
          )}
        </View>
        </>
      )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    marginLeft: 4,
    color: '#3498db',
  },
  // Card styles to replace react-native-paper
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 0,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  // Button styles
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContained: {
    backgroundColor: '#3498db',
  },
  buttonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  buttonTextContained: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonTextOutlined: {
    color: '#3498db',
    fontWeight: '600',
  },
  // Table styles
  table: {
    backgroundColor: '#fff',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
    padding: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 12,
  },
  tableCell: {
    flex: 1,
  },
  tableCellRight: {
    alignItems: 'flex-end',
  },
  tableCellText: {
    fontSize: 14,
    color: '#333',
  },
  tableCellTextRight: {
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  // Original styles
  filterCard: {
    margin: 16,
    elevation: 2,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#3498db',
  },
  filterChipText: {
    color: '#333',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#fff',
  },
  applyButton: {
    marginTop: 8,
    backgroundColor: '#3498db',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3498db',
  },
  tabText: {
    color: '#333',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabContent: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chartContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
}); 