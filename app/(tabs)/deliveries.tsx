import DeliveryDetailsModal from '@/components/DeliveryDetailsModal';
import PageTitleBar from '@/components/PageTitleBar';
import useScreenTransition from '@/hooks/useScreenTransition';
import { supabase } from '@/lib/supabase';
import { Check, Truck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

// Format date as "DD MMM" or "TODAY"
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Check if date is today
  const today = new Date();
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'TODAY';
  }

  // Format as "DD MMM" (e.g., "4 Apr")
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  return `${day} ${month}`;
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  
  return `${hours}:${minutesStr} ${ampm}`;
};

interface DeliveryItem {
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface DeliverySchedule {
  id: string;
  name: string;
  date: string;
  time: string;
  phone: string;
  address: string;
  items: DeliveryItem[];
  total: number;
  payment_method: string;
  status: string;
  verified: boolean;
  invoice_number: string | null;
}

// Generate invoice number based on sale ID and date
const generateInvoiceNumber = (sale: any): string => {
  if (sale.invoice_number) return sale.invoice_number;
  
  // Get the month from the sale date
  const currentDate = new Date(sale.created_at);
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero (MM)
  
  // Use the last 3 digits of the sale ID as the sequential number
  const sequentialNumber = sale.id.toString().substr(-3).padStart(3, '0');
  
  // Generate using format INV/2526-MM-XXX where MM is the actual month
  return `INV/2526-${currentMonth}-${sequentialNumber}`;
};

export default function DeliveriesScreen() {
  const { AnimatedContainer } = useScreenTransition();
  const [selectedDelivery, setSelectedDelivery] = useState<DeliverySchedule | null>(null);
  const [pendingDeliveries, setPendingDeliveries] = useState<DeliverySchedule[]>([]);
  const [pendingVerification, setPendingVerification] = useState<DeliverySchedule[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<DeliverySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  // Handle pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, fetch the sales records with delivery flag
      console.log("Fetching delivery sales...");
      const { data: deliverySales, error: salesError } = await supabase
        .from('sales')
        .select('*, invoice_number')
        .eq('delivery', true)
        .order('created_at', { ascending: false });
        
      if (salesError) {
        console.error("Error fetching delivery sales:", salesError);
        setError("Failed to fetch delivery data");
        return;
      }
      
      console.log(`Found ${deliverySales?.length || 0} delivery sales`);
      
      if (!deliverySales || deliverySales.length === 0) {
        setPendingDeliveries([]);
        setPendingVerification([]);
        setCompletedDeliveries([]);
        setLoading(false);
        return;
      }
      
      // Get unique customer IDs
      const customerIds = [...new Set(deliverySales.map((sale: any) => sale.customer_id))];
      const validCustomerIds = customerIds.filter(id => id !== null && id !== undefined);
      
      // Fetch customer data for these IDs
      let customerMap = new Map();
      
      if (validCustomerIds.length > 0) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id, name, contact_number, address')
          .in('id', validCustomerIds);
          
        if (customerError) {
          console.error("Error fetching customer data:", customerError);
        } else if (customerData) {
          // Create a map for quick customer lookup
          customerData.forEach((customer: any) => {
            customerMap.set(customer.id, customer);
          });
        }
      }

      // Fetch sale items for all deliveries
      const saleIds = deliverySales.map((sale: any) => sale.id);
      
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          id, 
          sale_id, 
          product_id, 
          quantity, 
          price, 
          total,
          products (
            product_name
          )
        `)
        .in('sale_id', saleIds);
        
      if (itemsError) {
        console.error("Error fetching sale items:", itemsError);
      }
      
      // Create a map to group items by sale_id
      const saleItemsMap = new Map();
      if (saleItems) {
        saleItems.forEach((item: any) => {
          if (!saleItemsMap.has(item.sale_id)) {
            saleItemsMap.set(item.sale_id, []);
          }
          saleItemsMap.get(item.sale_id).push({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            total: item.total || (item.price * item.quantity),
            product_name: item.products?.product_name || `Product ${item.product_id?.slice(-4) || 'Unknown'}`
          });
        });
      }

      // Format deliveries with promises for invoice numbers
      const deliveryPromises = deliverySales.map(async (sale: any) => {
        // Get customer info from map or use defaults
        const customer = customerMap.get(sale.customer_id) || {
          name: sale.customer_name || 'Unknown Customer',
          contact_number: 'N/A',
          address: 'N/A'
        };
        
        // Get items for this sale from the map or create a default item
        const saleItemsList = saleItemsMap.get(sale.id) || [{
          id: `default-${sale.id}`,
          product_name: `Sale #${sale.id.slice(-4)}`,
          quantity: 1,
          price: sale.total_amount || 0,
          total: sale.total_amount || 0
        }];
        
        // Generate invoice number if not present
        const invoiceNumber = sale.invoice_number || generateInvoiceNumber(sale);
        
        return {
          id: sale.id,
          name: customer.name,
          date: formatDate(sale.created_at),
          time: formatTime(sale.created_at),
          phone: customer.contact_number || 'N/A',
          address: customer.address || 'N/A',
          items: saleItemsList,
          total: sale.total_amount || 0,
          payment_method: sale.payment_method || 'unknown',
          status: sale.status || 'pending',
          verified: sale.verified || false,
          invoice_number: invoiceNumber
        };
      });
      
      // Resolve all promises
      const formattedDeliveries = await Promise.all(deliveryPromises);
      
      // Separate deliveries into categories
      const pending = formattedDeliveries.filter(d => d.status !== 'delivered');
      const verificationPending = formattedDeliveries.filter(d => 
        d.status === 'delivered' && d.verified === false
      );
      const completed = formattedDeliveries.filter(d => 
        d.status === 'delivered' && d.verified === true
      );
      
      console.log(`Processed ${formattedDeliveries.length} deliveries:`);
      console.log(`- ${pending.length} pending deliveries`);
      console.log(`- ${verificationPending.length} awaiting payment verification`);
      console.log(`- ${completed.length} fully completed`);
      
      setPendingDeliveries(pending);
      setPendingVerification(verificationPending);
      setCompletedDeliveries(completed);
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError('Failed to load deliveries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (deliveryId: string, newStatus: string, setVerified?: boolean) => {
    try {
      console.log(`Updating delivery ${deliveryId} status to ${newStatus}${setVerified ? ' and marking as verified' : ''}`);
      
      // Find the delivery to get its invoice number
      const delivery = [...pendingDeliveries, ...pendingVerification, ...completedDeliveries]
        .find(d => d.id === deliveryId);
      
      if (!delivery) {
        console.error(`Delivery with ID ${deliveryId} not found`);
        throw new Error('Delivery not found');
      }
      
      // Generate or use existing invoice number
      let invoiceNumber = delivery.invoice_number;
      if (!invoiceNumber) {
        invoiceNumber = generateInvoiceNumber({ id: deliveryId, created_at: new Date().toISOString() });
      }
      
      const updateData: any = { 
        status: newStatus,
        // Ensure the invoice number is saved
        invoice_number: invoiceNumber
      };
      
      // If setVerified is true, also update the verified field
      if (setVerified !== undefined) {
        updateData.verified = setVerified;
        // Add payment date when verifying
        if (setVerified) {
          updateData.payment_date = new Date().toISOString();
        }
      }
      
      console.log("Sending update with data:", JSON.stringify(updateData));
      
      const { data, error } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', deliveryId)
        .select();
      
      if (error) {
        console.error('Error updating delivery status:', error);
        console.error('Error details:', JSON.stringify(error));
        throw error;
      }
      
      console.log("Update successful, received data:", data);
      
      // Show appropriate success message based on the action
      if (newStatus === 'delivered' && !setVerified) {
        // Delivery completed but payment not verified yet
        Alert.alert(
          'Delivery Completed',
          'This delivery has been marked as completed. It will now appear in the payment verification queue.',
          [{ text: 'OK' }]
        );
      } else if (setVerified) {
        // Payment verification
        Alert.alert(
          'Payment Verified',
          'This delivery has been marked as paid and verified.',
          [{ text: 'OK' }]
        );
      }
      
      // Refresh data
      fetchDeliveries();
      
    } catch (err) {
      console.error('Error updating delivery status:', err);
      Alert.alert('Error', 'Failed to update delivery status. Please try again.');
    }
  };

  // Handle payment verification for delivered items
  const handleVerifyPayment = (deliveryId: string) => {
    // Find the delivery to get its invoice number
    const delivery = [...pendingDeliveries, ...pendingVerification, ...completedDeliveries]
      .find(d => d.id === deliveryId);
    
    if (!delivery) {
      console.error(`Delivery with ID ${deliveryId} not found for payment verification`);
      Alert.alert('Error', 'Delivery information not found. Please try again.');
      return;
    }

    Alert.alert(
      'Verify Payment',
      `Confirm that payment has been received for this delivery?\n\nInvoice: ${delivery.invoice_number || 'N/A'}\nCustomer: ${delivery.name}\nAmount: ₹${delivery.total.toLocaleString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Verify', 
          onPress: async () => {
            try {
              console.log(`Verifying payment for delivery ID: ${deliveryId}, Invoice: ${delivery.invoice_number}`);
              
              // Update sale record with both verified=true and maintaining status='delivered'
              const { error } = await supabase
                .from('sales')
                .update({ 
                  verified: true,
                  status: 'delivered', // Explicitly set status to 'delivered' to ensure it stays in correct category
                  invoice_number: delivery.invoice_number // Ensure invoice number is persisted
                })
                .eq('id', deliveryId);
                
              if (error) {
                console.error("Error updating verified status:", error);
                throw new Error(`Failed to verify payment: ${error.message}`);
              }
              
              console.log("Payment verification successful - verified set to TRUE with status='delivered'");
              
              // Show success message
              Alert.alert(
                'Payment Verified',
                'This delivery has been marked as paid and verified.',
                [{ text: 'OK' }]
              );
              
              // Refresh data
              fetchDeliveries();
            } catch (err) {
              console.error("Payment verification error:", err);
              Alert.alert('Error', 'Failed to verify payment. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <PageTitleBar title="Deliveries" showBack={true} />
        <ActivityIndicator size="large" color="#2B7BB0" />
        <Text style={styles.loadingText}>Loading deliveries...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <PageTitleBar title="Deliveries" showBack={true} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchDeliveries}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <AnimatedContainer style={styles.container}>
      <PageTitleBar title="Deliveries" showBack={false} />
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{paddingBottom: 80}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Schedule</Text>
          {pendingDeliveries.length === 0 ? (
            <Text style={styles.emptyText}>No scheduled deliveries</Text>
          ) : (
            <View style={styles.scheduleTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameCell]} numberOfLines={1} ellipsizeMode="tail">Name</Text>
                <Text style={[styles.headerCell, styles.phoneCell]} numberOfLines={1} ellipsizeMode="tail">Phone</Text>
                <Text style={[styles.headerCell, styles.dateCell]} numberOfLines={1} ellipsizeMode="tail">Date</Text>
                <Text style={[styles.headerCell, styles.actionCell]} numberOfLines={1} ellipsizeMode="tail">Action</Text>
              </View>
              {pendingDeliveries.map((delivery, index) => (
                <View 
                  key={delivery.id} 
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.alternateRow
                  ]}
                >
                  <Text style={[styles.cell, styles.nameCell]} numberOfLines={1} ellipsizeMode="tail">{delivery.name}</Text>
                  <Text style={[styles.cell, styles.phoneCell]} numberOfLines={1} ellipsizeMode="tail">{delivery.phone}</Text>
                  <Text 
                    style={[
                      styles.cell, 
                      styles.dateCell,
                      delivery.date === 'TODAY' && styles.todayText
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {delivery.date}
                  </Text>
                  <View style={[styles.cell, styles.actionCell]}>
                    <Pressable
                      style={styles.deliverButton}
                      onPress={() => setSelectedDelivery(delivery)}
                    >
                      <View style={styles.payButtonInner}>
                        <Truck size={14} color="#766b4f" style={styles.actionButtonIcon} />
                        <Text style={styles.payButtonText} numberOfLines={1}>Deliver</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivered - Payment Verification Pending</Text>
          {pendingVerification.length === 0 ? (
            <Text style={styles.emptyText}>No deliveries pending payment verification</Text>
          ) : (
            <View style={styles.scheduleTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameCell]} numberOfLines={1} ellipsizeMode="tail">Name</Text>
                <Text style={[styles.headerCell, styles.dateCell]} numberOfLines={1} ellipsizeMode="tail">Date</Text>
                <Text style={[styles.headerCell, styles.amountCell]} numberOfLines={1} ellipsizeMode="tail">Amount</Text>
                <Text style={[styles.headerCell, styles.modeCell]} numberOfLines={1} ellipsizeMode="tail">Mode</Text>
                {/* <Text style={[styles.headerCell, styles.statusCell]} numberOfLines={1} ellipsizeMode="tail">Status</Text> */}
                <Text style={[styles.headerCell, styles.paymentCell]} numberOfLines={1} ellipsizeMode="tail">Payment</Text>
              </View>
              {pendingVerification.map((delivery, index) => (
                <View 
                  key={delivery.id} 
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.alternateRow
                  ]}
                >
                  <Text style={[styles.cell, styles.nameCell]} numberOfLines={1} ellipsizeMode="tail">{delivery.name}</Text>
                  <Text 
                    style={[
                      styles.cell, 
                      styles.dateCell,
                      delivery.date === 'TODAY' && styles.todayText
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {delivery.date}
                  </Text>
                  <Text style={[styles.cell, styles.amountCell]} numberOfLines={1} ellipsizeMode="tail">₹{delivery.total.toLocaleString()}</Text>
                  <View style={[styles.cell, styles.modeCell]}>
                    <View style={[
                      styles.badgeBase,
                      styles.modeBadge,
                      delivery.payment_method === 'cash' ? styles.cashBadge :
                      delivery.payment_method === 'credit' ? styles.creditBadge :
                      styles.otherBadge
                    ]}>
                      <Text style={[
                        styles.badgeTextBase,
                        delivery.payment_method === 'cash' ? styles.cashText : styles.modeText
                      ]} numberOfLines={1} ellipsizeMode="tail">
                        {delivery.payment_method === 'cash' ? 'Cash' :
                         delivery.payment_method === 'credit' ? 'Credit' :
                         delivery.payment_method || 'Other'}
                      </Text>
                    </View>
                  </View>
                  {/* <View style={[styles.cell, styles.statusCell]}> ... </View> */}
                  <View style={[styles.cell, styles.paymentCell]}>
                    <Pressable
                      style={styles.payButton}
                      onPress={() => handleVerifyPayment(delivery.id)}
                    >
                      <View style={styles.payButtonInner}>
                        <Check size={14} color="#000000" style={styles.actionButtonIcon} />
                        <Text style={styles.payButtonText} numberOfLines={1}>Verify</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Deliveries</Text>
          {completedDeliveries.length === 0 ? (
            <Text style={styles.emptyText}>No completed deliveries</Text>
          ) : (
            <View style={styles.recentTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameCell]} numberOfLines={1} ellipsizeMode="tail">Name</Text>
                <Text style={[styles.headerCell, styles.dateCell]} numberOfLines={1} ellipsizeMode="tail">Date</Text>
                <Text style={[styles.headerCell, styles.amountCell]} numberOfLines={1} ellipsizeMode="tail">Amount</Text>
                <Text style={[styles.headerCell, styles.statusCell]} numberOfLines={1} ellipsizeMode="tail">Status</Text>
                <Text style={[styles.headerCell, styles.paymentCell]} numberOfLines={1} ellipsizeMode="tail">Payment</Text>
              </View>
              {completedDeliveries.map((delivery, index) => (
                <View 
                  key={delivery.id}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.alternateRow
                  ]}
                >
                  <Text style={[styles.cell, styles.nameCell]} numberOfLines={1} ellipsizeMode="tail">{delivery.name}</Text>
                  <Text 
                    style={[
                      styles.cell, 
                      styles.dateCell,
                      delivery.date === 'TODAY' && styles.todayText
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {delivery.date}
                  </Text>
                  <Text style={[styles.cell, styles.amountCell]} numberOfLines={1} ellipsizeMode="tail">₹{delivery.total.toLocaleString()}</Text>
                  <View style={[styles.cell, styles.statusCell]}>
                    <View style={styles.statusContainer}>
                      <View style={[styles.badgeBase, styles.deliveredBadge]}>
                        <Text style={[styles.badgeTextBase, styles.deliveredText]} numberOfLines={1} ellipsizeMode="tail">Delivered</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.cell, styles.paymentCell]}>
                    <View style={[
                      styles.badgeBase,
                      styles.paymentStatus,
                      styles.paidStatus
                    ]}>
                      <Text style={[
                        styles.badgeTextBase,
                        styles.paymentText,
                        styles.paidText
                      ]} numberOfLines={1} ellipsizeMode="tail">
                        Verified
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {selectedDelivery && (
        <DeliveryDetailsModal
          visible={!!selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          delivery={{
            id: selectedDelivery.id,
            customer_name: selectedDelivery.name,
            phone: selectedDelivery.phone,
            address: selectedDelivery.address,
            delivery_date: selectedDelivery.date,
            instructions: null,
            total: selectedDelivery.total,
            items: selectedDelivery.items,
            status: selectedDelivery.status,
            payment_method: selectedDelivery.payment_method,
            invoice_number: selectedDelivery.invoice_number || generateInvoiceNumber({
              id: selectedDelivery.id,
              created_at: new Date().toISOString()
            })
          }}
          onUpdateStatus={(status) => handleUpdateStatus(selectedDelivery.id, status)}
        />
      )}
    </AnimatedContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fcfe',
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e53935',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'AsapCondensed_400Regular',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2B7BB0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  content: {
    flex: 1,
    padding: 4,
  },
  section: {
    width: '100%',
    alignSelf: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
    marginBottom: 12,
    paddingLeft: 12,
    paddingTop: 6,
    color: '#2B7BB0',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontStyle: 'italic',
    fontFamily: 'AsapCondensed_400Regular',
  },
  scheduleTable: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  recentTable: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#90A4AE',
    paddingVertical: 4,
  },
  headerCell: {
    fontSize: 14,
    color: '#fff',
    paddingHorizontal: 12,
    fontFamily: 'AsapCondensed_400Regular',
    flexShrink: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  alternateRow: {
    backgroundColor: '#f8fff8',
  },
  cell: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    flexShrink: 1,
    textAlign: 'center',
  },
  nameCell: {
    flex: 1.3,
    textAlign: 'left',
  },
  phoneCell: {
    flex: 1.2,
  },
  dateCell: {
    flex: 0.7,
  },
  timeCell: {
    flex: 1,
  },
  amountCell: {
    flex: 1.0,
  },
  actionCell: {
    flex: 1.2,
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  todayText: {
    color: '#e53935',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  statusCell: {
    flex: 1.2,
    alignItems: 'center',
  },
  paymentCell: {
    flex: 1.2,
    alignItems: 'center',
  },
  paymentStatus: {
    // Empty, inheriting all properties from badgeBase
  },
  paidStatus: {
    backgroundColor: '#e8f5e9',
  },
  dueStatus: {
    backgroundColor: '#ffebee',
  },
  paymentText: {
    color: '#4CAF50',
    fontFamily: 'AsapCondensed_400Regular',
  },
  paidText: {
    color: '#4CAF50',
    fontFamily: 'AsapCondensed_400Regular',
  },
  emptyRow: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    width: '95%',
  },
  deliveredBadge: {
    backgroundColor: '#e8f5e9',
  },
  deliveredText: {
    color: '#4CAF50',
    fontFamily: 'AsapCondensed_400Regular',
  },
  modeCell: {
    flex: 0.8,
    alignItems: 'center',
  },
  modeBadge: {
    // Empty, inheriting all properties from badgeBase
  },
  cashBadge: {
    backgroundColor: '#E1F5FE',
    fontFamily: 'AsapCondensed_400Regular',
  },
  creditBadge: {
    backgroundColor: '#2196F3',
  },
  otherBadge: {
    backgroundColor: '#FF9800',
  },
  pendingPaymentBadge: {
    backgroundColor: '#FFEBEE',
  },
  pendingPaymentText: {
    color: '#e80505',
    fontFamily: 'AsapCondensed_400Regular',
  },
  // Common badge styles
  badgeBase: {
    padding: 0,
    paddingHorizontal: 5,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#cecece',
  },
  badgeTextBase: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  modeText: {
    color: '#ffffff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  cashText: {
    color: '#003366',
    fontFamily: 'AsapCondensed_400Regular',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  actionButtonIcon: {
    marginRight: 4,
  },
  payButton: {
    backgroundColor: '#daedc0',
    borderWidth: 2,            
    borderColor: '#feabb3',        
    borderRadius: 10,          
    flexDirection: 'row',   
    alignItems: 'center',   
    justifyContent: 'center',
  },
  payButtonInner: {
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  payButtonText: {
    color: '#766b4f',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  deliverButton: {
    backgroundColor: '#daedc0',
    borderWidth: 2,            
    borderColor: '#feabb3',
    borderRadius: 10,          
    flexDirection: 'row',   
    alignItems: 'center',   
    justifyContent: 'center',
  },
});