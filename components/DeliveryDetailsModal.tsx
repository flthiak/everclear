import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Check, ChevronDown, X, FileText, MapPin, Phone, Calendar, Clock, Truck, DollarSign } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import formatDate from '../utils/formatDate';

interface DeliveryDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  delivery: {
    id: string;
    customer_name: string;
    address: string;
    phone: string;
    delivery_date: string;
    instructions: string | null;
    total: number;
    items: any[];
    status: string;
    payment_method?: string | null;
    invoice_number?: string | null;
  };
  onUpdateStatus: (status: string) => void;
}

interface RelatedSale {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products: {
    product_name: string;
    id: string;
  };
}

export default function DeliveryDetailsModal({
  visible,
  onClose,
  delivery,
  onUpdateStatus,
}: DeliveryDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(
    delivery.payment_method ? delivery.payment_method.toLowerCase() : null
  );
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [relatedItems, setRelatedItems] = useState<any[]>([]);

  // Fetch related sales items when modal becomes visible
  useEffect(() => {
    if (visible) {
      if (delivery.invoice_number) {
        fetchRelatedSaleItems();
      } else {
        // Reset when modal closes
        setRelatedItems([]);
        setError(null);
      }
      
      // Check the deliveries table structure
      checkDeliveriesTable();
    }
  }, [visible, delivery.invoice_number]);

  const fetchRelatedSaleItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Start with checking if we have a sale ID
      if (!delivery.id) {
        console.error("No delivery ID provided");
        setError("Delivery data is incomplete");
        setLoading(false);
        return;
      }
      
      console.log(`Fetching items for delivery ID: ${delivery.id}`);
      
      // First get the sale to retrieve its invoice_number if not already available
      let invoiceNumber = delivery.invoice_number;
      
      if (!invoiceNumber) {
        try {
          const { data: saleData, error: saleError } = await supabase
            .from('sales')
            .select('invoice_number')
            .eq('id', delivery.id)
            .single();
          
          if (!saleError && saleData) {
            invoiceNumber = saleData.invoice_number;
            console.log(`Retrieved invoice number: ${invoiceNumber}`);
          }
        } catch (err) {
          console.error('Error fetching sale invoice number:', err);
        }
      }
      
      let items: any[] = [];
      
      // Try different approaches to fetch the items
      
      // 1. Try sale_items table with invoice_number
      if (invoiceNumber) {
        try {
          console.log(`Trying sale_items with invoice number: ${invoiceNumber}`);
          const { data, error } = await supabase
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
                product_name,
                size
              )
            `)
            .eq('invoice_number', invoiceNumber)
            .gt('price', 0); // Only return items with price > 0
          
          if (!error && data && data.length > 0) {
            console.log(`Found ${data.length} items in sale_items with invoice number`);
            items = data.map(item => ({
              id: item.id,
              sale_id: item.sale_id,
              product_id: item.product_id,
              product_name: item.products?.product_name || `Product #${item.product_id?.slice(-4) || '0000'}`,
              quantity: item.quantity,
              price: item.price,
              total: item.total_price || (item.price * item.quantity)
            }));
          }
        } catch (err) {
          console.error('Error with sale_items by invoice:', err);
        }
      }
      
      // 2. If that failed, try sales_items table with invoice_number
      if (invoiceNumber && items.length === 0) {
        try {
          console.log(`Trying sales_items with invoice number: ${invoiceNumber}`);
          const { data, error } = await supabase
            .from('sales_items')
            .select(`
              id, 
              sale_id, 
              product_id, 
              quantity, 
              price, 
              total,
              products (
                id, 
                product_name,
                size
              )
            `)
            .eq('invoice_number', invoiceNumber)
            .gt('price', 0); // Only return items with price > 0
          
          if (!error && data && data.length > 0) {
            console.log(`Found ${data.length} items in sales_items with invoice number`);
            items = data.map(item => ({
              id: item.id,
              sale_id: item.sale_id,
              product_id: item.product_id,
              product_name: item.products?.product_name || `Product #${item.product_id?.slice(-4) || '0000'}`,
              quantity: item.quantity,
              price: item.price,
              total: item.total || (item.price * item.quantity)
            }));
          }
        } catch (err) {
          console.error('Error with sales_items by invoice:', err);
        }
      }
      
      // 3. Try sale_items with sale_id
      if (items.length === 0) {
        try {
          console.log(`Trying sale_items with sale_id: ${delivery.id}`);
          const { data, error } = await supabase
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
                product_name,
                size
              )
            `)
            .eq('sale_id', delivery.id)
            .gt('price', 0); // Only return items with price > 0
          
          if (!error && data && data.length > 0) {
            console.log(`Found ${data.length} items in sale_items with sale_id`);
            items = data.map(item => ({
              id: item.id,
              sale_id: item.sale_id,
              product_id: item.product_id,
              product_name: item.products?.product_name || `Product #${item.product_id?.slice(-4) || '0000'}`,
              quantity: item.quantity,
              price: item.price,
              total: item.total_price || (item.price * item.quantity)
            }));
          }
        } catch (err) {
          console.error('Error with sale_items by sale_id:', err);
        }
      }
      
      // 4. Try sales_items with sale_id
      if (items.length === 0) {
        try {
          console.log(`Trying sales_items with sale_id: ${delivery.id}`);
          const { data, error } = await supabase
            .from('sales_items')
            .select(`
              id, 
              sale_id, 
              product_id, 
              quantity, 
              price, 
              total,
              products (
                id, 
                product_name,
                size
              )
            `)
            .eq('sale_id', delivery.id)
            .gt('price', 0); // Only return items with price > 0
          
          if (!error && data && data.length > 0) {
            console.log(`Found ${data.length} items in sales_items with sale_id`);
            items = data.map(item => ({
              id: item.id,
              sale_id: item.sale_id,
              product_id: item.product_id,
              product_name: item.products?.product_name || `Product #${item.product_id?.slice(-4) || '0000'}`,
              quantity: item.quantity,
              price: item.price,
              total: item.total || (item.price * item.quantity)
            }));
          }
        } catch (err) {
          console.error('Error with sales_items by sale_id:', err);
        }
      }
      
      // If we have items from any of the above methods, use them
      if (items.length > 0) {
        console.log(`Using ${items.length} items found from database queries`);
        setRelatedItems(items);
        setLoading(false);
        return;
      }
      
      // If we have delivery items already, use those
      if (delivery.items && delivery.items.length > 0) {
        console.log(`Using ${delivery.items.length} items from delivery object`);
        
        // Check if the items have the correct format
        const validItems = delivery.items.every(item => 
          item.product_name && 
          typeof item.quantity === 'number' && 
          typeof item.price === 'number'
        );
        
        if (validItems) {
          setRelatedItems(delivery.items);
        } else {
          // Format items if they don't have the correct structure
          const formattedItems = delivery.items.map((item: any) => ({
            id: item.id || `item-${Math.random().toString(36).substr(2, 9)}`,
            product_id: item.product_id || 'unknown',
            product_name: item.product_name || `Product #${item.product_id?.slice(-4) || '0000'}`,
            quantity: item.quantity || 1,
            price: item.price || 0,
            total: item.total || (item.price * item.quantity) || 0
          }));
          setRelatedItems(formattedItems);
        }
        
        setLoading(false);
        return;
      }
      
      // As a last resort, create a fallback item
      console.log("No items found, creating fallback item");
      const fallbackItem = {
        id: `default-${delivery.id}`,
        product_id: 'unknown',
        product_name: `Sale #${delivery.id.slice(-4)}`,
        quantity: 1,
        price: delivery.total,
        total: delivery.total
      };
      
      setRelatedItems([fallbackItem]);
    } catch (err) {
      console.error('Error in fetchRelatedSaleItems:', err);
      setError('An unexpected error occurred while fetching items');
      
      // Create a fallback item for any unexpected errors
      const fallbackItem = {
        id: `default-${delivery.id}`,
        product_name: `Sale #${delivery.id.slice(-4)}`,
        quantity: 1,
        price: delivery.total,
        total: delivery.total
      };
      setRelatedItems([fallbackItem]);
    } finally {
      setLoading(false);
    }
  };

  const checkDeliveriesTable = async () => {
    try {
      console.log('Checking sales table structure...');
      
      // Try to get the first record to examine structure
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .limit(1);
        
      if (error) {
        console.error('Error checking sales table:', error);
      } else {
        console.log('Sales table sample:', data && data.length > 0 ? data[0] : 'No records');
      }
    } catch (err) {
      console.error('Error in checkDeliveriesTable:', err);
    }
  };

  const handleMarkDelivered = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Trying to mark sale ${delivery.id} as delivered with payment method: ${paymentMethod}`);
      
      // Use a single, simplified update
      const { data, error } = await supabase
        .from('sales')
        .update({ 
          status: 'delivered',
          payment_method: paymentMethod
        })
        .eq('id', delivery.id)
        .select();
        
      if (error) {
        console.error('Error updating sale:', error);
        setError('Database error. Please try again.');
      } else {
        console.log('Sale updated successfully:', data);
        
        // Call the parent's callback to refresh the list
        onUpdateStatus('delivered');
        onClose();
      }
    } catch (err) {
      console.error('Unexpected error in handleMarkDelivered:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Determine which items to display
  const displayItems = relatedItems.length > 0 ? relatedItems : delivery.items;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delivery Details</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={22} color="#555" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.customerCard}>
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>{delivery.customer_name}</Text>
                <Text style={styles.invoiceNumber}>Invoice #{delivery.invoice_number || 'N/A'}</Text>
                
                <View style={styles.infoRow}>
                  <Phone size={18} color="#666" />
                  <Text style={styles.infoText}>{delivery.phone}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <MapPin size={18} color="#666" />
                  <Text style={styles.infoText}>{delivery.address}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Calendar size={18} color="#666" />
                  <Text style={styles.infoText}>{delivery.delivery_date}</Text>
                </View>

                {delivery.instructions && (
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsLabel}>Special Instructions:</Text>
                    <Text style={styles.instructions}>{delivery.instructions}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.itemsCard}>
              <Text style={styles.sectionTitle}>Items</Text>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2B7BB0" />
                  <Text style={styles.loadingText}>Loading items...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : displayItems && displayItems.length > 0 ? (
                <View style={styles.itemsList}>
                  <View style={styles.itemsHeader}>
                    <Text style={[styles.itemHeaderText, styles.itemNameHeader]}>Item</Text>
                    <Text style={[styles.itemHeaderText, styles.itemQtyHeader]}>Qty</Text>
                    <Text style={[styles.itemHeaderText, styles.itemPriceHeader]}>Price</Text>
                    <Text style={[styles.itemHeaderText, styles.itemTotalHeader]}>Total</Text>
                  </View>
                  
                  {displayItems.map((item, index) => (
                    <View 
                      key={item.id || index}
                      style={[
                        styles.itemRow,
                        index % 2 === 1 && styles.alternateItemRow
                      ]}
                    >
                      <Text style={[styles.itemText, styles.itemName]}>{item.product_name}</Text>
                      <Text style={[styles.itemText, styles.itemQty]}>{item.quantity}</Text>
                      <Text style={[styles.itemText, styles.itemPrice]}>₹{Number(item.price).toFixed(2)}</Text>
                      <Text style={[styles.itemText, styles.itemTotal]}>₹{Number(item.total || (item.quantity * item.price)).toFixed(2)}</Text>
                    </View>
                  ))}
                  
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalAmount}>₹{delivery.total.toFixed(2)}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noItemsText}>No items found for this delivery</Text>
              )}
            </View>
            
            {delivery.status !== 'delivered' && (
              <View style={styles.actionCard}>
                <Text style={styles.sectionTitle}>Delivery Status</Text>
                
                <View style={styles.actionRow}>
                  <View style={styles.paymentMethodContainer}>
                    <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
                    
                    <Pressable 
                      style={styles.paymentDropdown}
                      onPress={() => setShowPaymentDropdown(!showPaymentDropdown)}
                    >
                      <Text style={styles.paymentDropdownText}>
                        {paymentMethod 
                          ? paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) 
                          : 'Select payment method'}
                      </Text>
                      <ChevronDown size={20} color="#666" />
                    </Pressable>
                    
                    {showPaymentDropdown && (
                      <View style={styles.paymentDropdownMenu}>
                        <Pressable 
                          style={[styles.paymentOption, paymentMethod === 'cash' && styles.selectedPaymentOption]}
                          onPress={() => {
                            setPaymentMethod('cash');
                            setShowPaymentDropdown(false);
                          }}
                        >
                          <Text style={[styles.paymentOptionText, paymentMethod === 'cash' && styles.selectedPaymentOptionText]}>Cash</Text>
                        </Pressable>
                        
                        <Pressable 
                          style={[styles.paymentOption, paymentMethod === 'credit' && styles.selectedPaymentOption]}
                          onPress={() => {
                            setPaymentMethod('credit');
                            setShowPaymentDropdown(false);
                          }}
                        >
                          <Text style={[styles.paymentOptionText, paymentMethod === 'credit' && styles.selectedPaymentOptionText]}>Credit</Text>
                        </Pressable>
                        
                        <Pressable 
                          style={[styles.paymentOption, paymentMethod === 'upi' && styles.selectedPaymentOption]}
                          onPress={() => {
                            setPaymentMethod('upi');
                            setShowPaymentDropdown(false);
                          }}
                        >
                          <Text style={[styles.paymentOptionText, paymentMethod === 'upi' && styles.selectedPaymentOptionText]}>UPI</Text>
                        </Pressable>
                      </View>
                    )}
                    
                    {error && <Text style={styles.errorText}>{error}</Text>}
                  </View>

                  <Pressable 
                    style={[
                      styles.markDeliveredButton,
                      (!paymentMethod || loading) && styles.disabledButton
                    ]}
                    onPress={handleMarkDelivered}
                    disabled={!paymentMethod || loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Truck size={16} color="#fff" />
                        <Text style={styles.markDeliveredButtonText}>Mark as Delivered</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingLeft: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B7BB0',
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
  },
  modalBody: {
    padding: 16,
  },
  customerCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  customerDetails: {
    gap: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
  },
  instructionsContainer: {
    marginTop: 8,
    backgroundColor: '#fff8e1',
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#ffca28',
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f57c00',
    marginBottom: 4,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  itemsList: {
    marginTop: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f5f5f5',
  },
  itemHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  itemNameHeader: {
    flex: 1,
    paddingLeft: 8,
  },
  itemQtyHeader: {
    flex: 0.5,
    textAlign: 'center',
  },
  itemPriceHeader: {
    flex: 1,
    textAlign: 'right',
  },
  itemTotalHeader: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 8,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  alternateItemRow: {
    backgroundColor: '#f9f9f9',
  },
  itemText: {
    fontSize: 14,
    color: '#333',
  },
  itemName: {
    flex: 1,
    paddingLeft: 8,
  },
  itemQty: {
    flex: 0.5,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 1,
    textAlign: 'right',
  },
  itemTotal: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 8,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B7BB0',
  },
  noItemsText: {
    textAlign: 'center',
    padding: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  actionCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  paymentMethodContainer: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#555',
    marginBottom: 8,
  },
  paymentDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 4,
    backgroundColor: '#fff',
  },
  paymentDropdownText: {
    fontSize: 14,
    color: '#333',
  },
  paymentDropdownMenu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  paymentOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedPaymentOption: {
    backgroundColor: '#e8f4fd',
    borderLeftWidth: 3,
    borderLeftColor: '#2B7BB0',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedPaymentOptionText: {
    fontWeight: '500',
    color: '#2B7BB0',
  },
  markDeliveredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B7BB0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minWidth: 160,
  },
  markDeliveredButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});