import HamburgerMenu from '@/components/HamburgerMenu';
import PageTitleBar from '@/components/PageTitleBar';
import useScreenTransition from '@/hooks/useScreenTransition';
import { supabase } from '@/lib/supabase';
import { Link } from 'expo-router';
import { Box, IndianRupee, Lightbulb, LightbulbOff, Package, ShoppingBag, Truck, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function IndexScreen() {
  const { AnimatedContainer } = useScreenTransition();
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [salesCount, setSalesCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [pendingDeliveries, setPendingDeliveries] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openMenu = () => {
    setIsMenuOpen(true);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check power status
        const { data: powerData } = await supabase
          .from('power_outages')
          .select('*')
          .is('end_time', null)
          .limit(1);
        
        setIsPowerOn(!(powerData && powerData.length > 0));
        
        // Get recent sales count
        const { count: salesCount } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        
        setSalesCount(salesCount || 0);
        
        // Get payments due count and total from sales table where verified=false
        const { count: paymentsCount, error: paymentsCountError } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })
          .eq('verified', false);
        
        if (paymentsCountError) {
          console.error('Error fetching payments count:', paymentsCountError);
        }
        
        setPaymentsCount(paymentsCount || 0);
        
        // Get total payments due amount from sales table
        const { data: paymentsData, error: paymentsDataError } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('verified', false);
          
        if (paymentsDataError) {
          console.error('Error fetching payments total:', paymentsDataError);
        }
        
        const totalDue = paymentsData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
        // console.log('Total payments due:', totalDue);
        setPaymentsTotal(totalDue);
        
        // Get weekly revenue
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const { data: weeklyData } = await supabase
          .from('sales')
          .select('total_amount')
          .gte('created_at', weekStart.toISOString())
          .not('status', 'eq', 'cancelled');
          
        const weeklyTotal = weeklyData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
        setWeeklyRevenue(weeklyTotal);
        
        // Get monthly revenue
        const monthStart = new Date();
        monthStart.setDate(1); // First day of current month
        const { data: monthlyData } = await supabase
          .from('sales')
          .select('total_amount')
          .gte('created_at', monthStart.toISOString())
          .not('status', 'eq', 'cancelled');
          
        const monthlyTotal = monthlyData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
        setMonthlyRevenue(monthlyTotal);
        
        // Get pending deliveries count
        const { count: deliveriesCount, error: deliveriesError } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })
          .eq('delivery', true)
          .eq('status', 'pending');
          
        if (deliveriesError) {
          console.error('Error fetching pending deliveries:', deliveriesError);
        }
        
        setPendingDeliveries(deliveriesCount || 0);
        
        // Get low stock items count
        const { count: lowStockCount } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true })
          .lt('quantity', 10); // Items with less than 10 in stock
          
        setLowStockItems(lowStockCount || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <View style={styles.fullContainer}>
      {isMenuOpen && <HamburgerMenu isOpen={isMenuOpen} onClose={closeMenu} />}
      <AnimatedContainer style={styles.container}>
        <PageTitleBar title="Dashboard" showBack={false} />
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={{paddingBottom: 80}}
        >
          
          {/* Quick Actions */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {/* First Row */}
              <View style={styles.rowContainer}>
                <View style={styles.actionCardWrapper}>
                  <Link href="/(tabs)/sales" asChild>
                    <Pressable style={styles.actionCard}>
                      <View style={[styles.actionIconContainer, { backgroundColor: '#e3f2fd' }]}>
                        <ShoppingBag size={24} color="#2196F3" />
                      </View>
                      <Text style={styles.actionTitle}>New Sale</Text>
                    </Pressable>
                  </Link>
                </View>
                
                <View style={styles.actionCardWrapper}>
                  <Link href="/(tabs)/payments" asChild>
                    <Pressable style={styles.actionCard}>
                      <View style={[styles.actionIconContainer, { backgroundColor: '#e8f5e9' }]}>
                        <IndianRupee size={24} color="#4CAF50" />
                      </View>
                      <Text style={styles.actionTitle}>Payments</Text>
                      {paymentsCount > 0 && (
                        <View style={[styles.badge, {width: 'auto', paddingHorizontal: 8}]}>
                          <Text style={styles.badgeText}>₹{paymentsTotal > 999 ? (paymentsTotal/1000).toFixed(1) + 'K' : paymentsTotal}</Text>
                        </View>
                      )}
                    </Pressable>
                  </Link>
                </View>
                
                <View style={styles.actionCardWrapper}>
                  <Link href="/(tabs)/stock" asChild>
                    <Pressable style={styles.actionCard}>
                      <View style={[styles.actionIconContainer, { backgroundColor: '#fff3e0' }]}>
                        <Package size={24} color="#FF9800" />
                      </View>
                      <Text style={styles.actionTitle}>Stock</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
              
              {/* Second Row */}
              <View style={styles.rowContainer}>
                <View style={styles.actionCardWrapper}>
                  <Link href="/(tabs)/deliveries" asChild>
                    <Pressable style={styles.actionCard}>
                      <View style={[styles.actionIconContainer, { backgroundColor: '#f3e5f5' }]}>
                        <Truck size={24} color="#9C27B0" />
                      </View>
                      <Text style={styles.actionTitle}>Deliveries</Text>
                      {pendingDeliveries > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{pendingDeliveries}</Text>
                        </View>
                      )}
                    </Pressable>
                  </Link>
                </View>
                
                <View style={styles.actionCardWrapper}>
                  <Link href="/(tabs)/management" asChild>
                    <Pressable style={styles.actionCard}>
                      <View style={[styles.actionIconContainer, { backgroundColor: '#e0f7fa' }]}>
                        <Users size={24} color="#00BCD4" />
                      </View>
                      <Text style={styles.actionTitle}>Customers</Text>
                    </Pressable>
                  </Link>
                </View>

                <View style={styles.actionCardWrapper}>
                  <Link href="/(tabs)/supplies" asChild>
                    <Pressable style={styles.actionCard}>
                      <View style={[styles.actionIconContainer, { backgroundColor: '#fff8e1' }]}>
                        <Box size={24} color="#FFC107" />
                      </View>
                      <Text style={styles.actionTitle}>Supplies</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </View>
          </View>

          {/* Business Insights */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Business Insights</Text>
            
            {/* Revenue Row */}
            <View style={styles.insightRow}>
              <View style={styles.insightCard}>
                <View style={[styles.iconContainer, {backgroundColor: '#e3f2fd'}]}>
                  <IndianRupee size={20} color="#2196F3" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Weekly Revenue</Text>
                  <Text style={styles.insightValue}>₹{weeklyRevenue.toLocaleString()}</Text>
                </View>
              </View>
              
              <View style={styles.insightCard}>
                <View style={[styles.iconContainer, {backgroundColor: '#e8f5e9'}]}>
                  <IndianRupee size={20} color="#4CAF50" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Monthly Revenue</Text>
                  <Text style={styles.insightValue}>₹{monthlyRevenue.toLocaleString()}</Text>
                </View>
              </View>
            </View>
            
            {/* Sales Row */}
            <View style={styles.insightRow}>
              <View style={styles.insightCard}>
                <View style={[styles.iconContainer, {backgroundColor: '#fff3e0'}]}>
                  <ShoppingBag size={20} color="#FF9800" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Sales This Week</Text>
                  <Text style={styles.insightValue}>{salesCount}</Text>
                </View>
              </View>
              
              <View style={styles.insightCard}>
                <View style={[styles.iconContainer, {backgroundColor: '#ffebee'}]}>
                  <IndianRupee size={20} color="#F44336" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Unpaid Sales</Text>
                  <Text style={styles.insightValue}>{paymentsCount}</Text>
                  <Text style={styles.insightSubValue}>₹{paymentsTotal.toLocaleString()}</Text>
                </View>
              </View>
            </View>
            
            {/* Inventory & Delivery Row */}
            <View style={styles.insightRow}>
              <View style={styles.insightCard}>
                <View style={[styles.iconContainer, {backgroundColor: '#f3e5f5'}]}>
                  <Truck size={20} color="#9C27B0" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Pending Deliveries</Text>
                  <Text style={styles.insightValue}>{pendingDeliveries}</Text>
                  {pendingDeliveries > 0 && (
                    <Text style={[styles.insightSubValue, { color: 'darkred' }]}>Requires Attention</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.insightCard}>
                <View style={[styles.iconContainer, {backgroundColor: '#e0f7fa'}]}>
                  <Package size={20} color="#00BCD4" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightLabel}>Low Stock Items</Text>
                  <Text style={styles.insightValue}>{lowStockItems}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* System Status */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>System Status</Text>
            <View style={{alignItems: 'center'}}>
              {/* Power Status Card */}
              <Link href="/power-outage" asChild>
                {
                  isPowerOn ? (
                    <Pressable style={styles.powerStatusOn}>
                      <View style={[styles.powerStatusIconContainer, { backgroundColor: '#FFBF00' }]}>
                        <Lightbulb size={32} color="#fff" />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.powerStatusLabel}>Power Status</Text>
                        <Text style={[styles.powerStatusValue, { color: '#2E7D32' }]}>
                          POWER IS ON
                        </Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.powerStatusOff}>
                      <View style={styles.powerStatusIconContainer}>
                        <LightbulbOff size={32} color="#F44336" />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.powerStatusLabel}>Power Status</Text>
                        <Text style={[styles.powerStatusValue, { color: '#C62828' }]}>
                          POWER IS OFF
                        </Text>
                      </View>
                    </Pressable>
                  )
                }
              </Link>
            </View>
          </View>
        </ScrollView>
      </AnimatedContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    position: 'relative',
    paddingBottom: 80,
  },
  container: {
    flex: 1,
    backgroundColor: '#f7fcfe',
  },
  content: {
    flex: 1,
    padding: 4,
  },
  sectionContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
    marginBottom: 12,
    paddingLeft: 6,
    paddingTop: 6,
    color: '#2B7BB0',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  rowContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 12,
  },
  actionCardWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  actionCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    textAlign: 'center',
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fdb1f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  insightSubValue: {
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  powerStatusOn: {
    width: '80%',
    borderRadius: 12,
    marginBottom: 20,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderLeftWidth: 4,
    backgroundColor: '#f1f8e9',
    borderLeftColor: '#4CAF50',
    shadowColor: 'green',
  },
  powerStatusOff: {
    width: '80%',
    borderRadius: 12,
    marginBottom: 20,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderLeftWidth: 4,
    backgroundColor: '#000000',
    borderLeftColor: '#F44336',
    shadowColor: 'black',
  },
  powerStatusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  powerStatusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  powerStatusValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});