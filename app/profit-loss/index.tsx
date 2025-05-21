import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface RevenueItem {
  source: string;
  amount: number;
}

interface ExpenseItem {
  category: string;
  amount: number;
}

export default function ProfitLossScreen() {
  const [salaryExpense, setSalaryExpense] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [supplyExpenses, setSupplyExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  // Calculate monthly interest income
  const principal = 4000000;
  const annualInterestRate = 0.075; // 7.5%
  const monthlyInterestIncome = Math.round((principal * annualInterestRate) / 12);

  // Commission data comparing this year vs last year
  const commissionData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        data: [20000, 45000, 28000, 80000, 99000, 43000],
        color: (opacity = 1) => `rgba(43, 123, 176, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: [15000, 35000, 25000, 70000, 90000, 35000],
        color: (opacity = 1) => `rgba(149, 165, 166, ${opacity})`,
        strokeWidth: 2,
        strokeDashArray: [5, 5]
      }
    ],
    legend: ["This Year", "Last Year"]
  };

  // Chart data for different time periods
  const weeklyData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [5000, 8000, 12000, 9000, 15000, 20000, 17000],
        color: (opacity = 1) => `rgba(43, 123, 176, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: [4000, 6000, 10000, 7000, 12000, 16000, 14000],
        color: (opacity = 1) => `rgba(149, 165, 166, ${opacity})`,
        strokeWidth: 2,
        strokeDashArray: [5, 5]
      }
    ],
    legend: ["This Week", "Last Week"]
  };

  const monthlyData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        data: [20000, 45000, 28000, 80000, 99000, 43000],
        color: (opacity = 1) => `rgba(43, 123, 176, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: [15000, 35000, 25000, 70000, 90000, 35000],
        color: (opacity = 1) => `rgba(149, 165, 166, ${opacity})`,
        strokeWidth: 2,
        strokeDashArray: [5, 5]
      }
    ],
    legend: ["This Year", "Last Year"]
  };

  const yearlyData = {
    labels: ["2023", "2024", "2025", "2026", "2027"],
    datasets: [
      {
        data: [350000, 420000, 510000, 590000, 650000],
        color: (opacity = 1) => `rgba(43, 123, 176, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: [300000, 380000, 450000, 520000, 600000],
        color: (opacity = 1) => `rgba(149, 165, 166, ${opacity})`,
        strokeWidth: 2,
        strokeDashArray: [5, 5]
      }
    ],
    legend: ["Current", "Previous"]
  };

  // Get the appropriate chart data based on selected period
  const getChartData = () => {
    switch (selectedPeriod) {
      case 'week':
        return weeklyData;
      case 'year':
        return yearlyData;
      case 'month':
      default:
        return monthlyData;
    }
  };

  useEffect(() => {
    fetchSalaryData();
    fetchDailyExpenses();
    fetchSupplyExpenses();
  }, []);

  const fetchSalaryData = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('base_pay');

      if (error) {
        throw error;
      }

      const totalBasePay = data.reduce((sum, staff) => sum + (staff.base_pay || 0), 0);
      setSalaryExpense(totalBasePay);
    } catch (err) {
      console.error('Error fetching salary data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyExpenses = async () => {
    try {
      // Get the first and last day of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      console.log('Fetching expenses for month:', startOfMonth.toLocaleDateString(), 'to', endOfMonth.toLocaleDateString());

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data) {
        console.log('No data returned from expenses query');
        setDailyExpenses(0);
        return;
      }

      console.log('Found', data.length, 'expenses for current month');
      
      // Ensure we're handling numeric values properly
      const totalExpenses = data.reduce((sum, expense) => {
        const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : Number(expense.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      console.log('Total expenses calculated:', totalExpenses);
      setDailyExpenses(totalExpenses);
    } catch (err) {
      console.error('Error fetching daily expenses:', err);
      // Set to 0 on error to avoid undefined values
      setDailyExpenses(0);
    }
  };

  const fetchSupplyExpenses = async () => {
    try {
      // Get the first and last day of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      console.log('Fetching supply expenses for month:', startOfMonth.toLocaleDateString(), 'to', endOfMonth.toLocaleDateString());

      const { data, error } = await supabase
        .from('suppliers')
        .select('paid_amount');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data) {
        console.log('No data returned from suppliers query');
        setSupplyExpenses(0);
        return;
      }

      console.log('Found', data.length, 'supplier entries');
      
      // Calculate total paid amount from suppliers
      const totalPaid = data.reduce((sum, supplier) => {
        const amount = typeof supplier.paid_amount === 'string' 
          ? parseFloat(supplier.paid_amount) 
          : Number(supplier.paid_amount || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      console.log('Total supply expenses calculated:', totalPaid);
      setSupplyExpenses(totalPaid);
    } catch (err) {
      console.error('Error fetching supply expenses:', err);
      // Set to 0 on error to avoid undefined values
      setSupplyExpenses(0);
    }
  };

  const revenueItems: RevenueItem[] = [
    { source: 'Sales', amount: 800000 },
    { source: 'Investments', amount: monthlyInterestIncome },
  ];

  const expenseItems: ExpenseItem[] = [
    { category: 'Salaries', amount: salaryExpense },
    { category: 'Daily Expenses', amount: dailyExpenses },
    { category: 'Supplies', amount: supplyExpenses },
  ];

  const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <View style={styles.container}>
      <PageTitleBar title="Profit & Loss" showBack={false} />
      <ScrollView style={styles.content} contentContainerStyle={{paddingBottom: 80}}>


        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Revenue</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.sourceCell]}>Source</Text>
              <Text style={[styles.headerCell, styles.amountCell]}>Amount</Text>
            </View>

            {revenueItems.map((item, index) => (
              <View 
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.alternateRow
                ]}
              >
                <Text style={[styles.cell, styles.sourceCell]}>{item.source}</Text>
                <Text style={[styles.cell, styles.amountCell]}>₹{item.amount.toLocaleString()}</Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={[styles.totalCell, styles.sourceCell]}>Total Revenue</Text>
              <Text style={[styles.totalCell, styles.amountCell]}>₹{totalRevenue.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expenses</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.sourceCell]}>Category</Text>
              <Text style={[styles.headerCell, styles.amountCell]}>Amount</Text>
            </View>

            {expenseItems.map((item, index) => (
              <View 
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 1 && styles.alternateRow
                ]}
              >
                <Text style={[styles.cell, styles.sourceCell]}>{item.category}</Text>
                <Text style={[styles.cell, styles.amountCell]}>₹{item.amount.toLocaleString()}</Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={[styles.totalCell, styles.sourceCell]}>Total Expenses</Text>
              <Text style={[styles.totalCell, styles.amountCell]}>₹{totalExpenses.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.netProfitSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Net Profit/Loss</Text>
          </View>

          <View style={styles.netProfitContent}>
            <Text style={[
              styles.netProfitAmount,
              netProfit >= 0 ? styles.profitText : styles.lossText
            ]}>
              ₹{Math.abs(netProfit).toLocaleString()}
            </Text>
            <Text style={styles.profitLabel}>
              ({netProfit >= 0 ? 'Profit' : 'Loss'})
            </Text>
          </View>
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Profit Margin</Text>
            <Text style={styles.summaryValue}>
              {((netProfit / totalRevenue) * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expense Ratio</Text>
            <Text style={styles.summaryValue}>
              {((totalExpenses / totalRevenue) * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
        
        {/* Commission Line Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Compared to past performance</Text>
          </View>
          
          <View style={styles.periodSelector}>
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
            <Pressable
              style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('year')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'year' && styles.periodButtonTextActive]}>
                Year
              </Text>
            </Pressable>
          </View>
          
          <View style={styles.chartContainer}>
            <LineChart
              data={getChartData()}
              width={Dimensions.get('window').width - 32}
              height={220}
              yAxisLabel="₹"
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: "#ffa726"
                }
              }}
              bezier
              style={styles.chart}
              fromZero
            />
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2B7BB0' }]} />
              <Text style={styles.legendText}>This Period</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#95A5A6' }]} />
              <Text style={styles.legendText}>Last Period</Text>
            </View>
          </View>
        </View>
        
        {/* Bottom spacer to prevent content from being hidden by navigation bar */}
        <View style={styles.bottomSpacer} />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerText: {
    fontSize: 24,
    color: '#2B7BB0',
    fontFamily: 'AsapCondensed_400Regular',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: '#2B7BB0',
    padding: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 6,
  },
  alternateRow: {
    backgroundColor: '#f8fff8',
  },
  cell: {
    fontSize: 14,
    paddingHorizontal: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  sourceCell: {
    flex: 2,
  },
  amountCell: {
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B7BB0',
    paddingHorizontal: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  netProfitSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  netProfitContent: {
    padding: 24,
    alignItems: 'center',
  },
  netProfitAmount: {
    fontSize: 36,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  profitText: {
    color: '#4CAF50',
  },
  lossText: {
    color: '#f44336',
  },
  profitLabel: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B7BB0',
    fontFamily: 'AsapCondensed_400Regular',
  },
  bottomSpacer: {
    height: 10,
  },
  chartContainer: {
    padding: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#2B7BB0',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  periodButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
