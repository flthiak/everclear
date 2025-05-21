import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import { Calendar, ChevronDown } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

// Interfaces & Types
interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  product_sn: string;
}

interface OrderItem {
  size: string;
  quantity: number;
  price: number;
  total: number;
}

type CustomerType = 'Customer' | 'Distributor' | 'Quick';
type PaymentMethod = 'Cash' | 'Credit' | 'UPI' | 'NEFT';

interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  contact_number?: string;
  phone?: string;
  address?: string;
  is_distributor?: boolean;
  credit_limit?: number;
  current_credit?: number;
  is_active?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  current_balance?: number;
  type?: string;
}

export default function SalesScreen() {
  // State variables
  const [selectedType, setSelectedType] = useState<CustomerType>('Customer');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saveToCustomerDB, setSaveToCustomerDB] = useState(false);
  const [isDiscountCustomer, setIsDiscountCustomer] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Ref for measuring dropdown button position
  const dropdownButtonRef = React.useRef<View>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 180, left: 20, right: 20 });
  
  // Scroll view ref with proper type
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Function to measure the position of the dropdown button
  const measureDropdownPosition = () => {
    if (dropdownButtonRef.current) {
      dropdownButtonRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        setDropdownPosition({
          top: py + height + 5,
          left: px,
          right: px + width,
        });
      });
    }
  };

  // Modified function to toggle dropdown and measure position
  const toggleDropdown = () => {
    if (!showCustomerDropdown) {
      measureDropdownPosition();
    }
    setShowCustomerDropdown(!showCustomerDropdown);
  };

  // Fetch stock data when customer type or customer changes
  useEffect(() => {
    fetchStockData();
  }, [selectedType, selectedCustomer, isDelivery, isDiscountCustomer]);

  // Initialize order items when stock items change
  useEffect(() => {
    const newOrderItems = stockItems.map(item => ({
      size: item.product_name,
      quantity: 0,
      price: item.price,
      total: 0
    }));
    setOrderItems(newOrderItems);
  }, [stockItems]);

  // Fetch customers when selection changes
  useEffect(() => {
    if (isExistingCustomer) {
      fetchCustomers();
    }
  }, [isExistingCustomer, selectedType]);

  // Effect for handling customer type selection and field resets
  useEffect(() => {
    // console.log("Customer type changed to:", selectedType);
    
    // Reset fields when type changes
    if (selectedType === 'Quick') {
      // For Quick sales, reset and set specific values
      setIsExistingCustomer(false);
      setSelectedCustomer(null);
      setIsDelivery(false);
      setDeliveryDate(new Date());
      setCustomerName('Quick Sale');
      setCustomerPhone('1111111111');
      setCustomerAddress('');
    } else {
      // For other customer types, clear the fields
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      // Only reset these if we're not on initial load
      setIsExistingCustomer(false);
      setSelectedCustomer(null);
    }
    
    // Handle Distributor specific settings
    if (selectedType === 'Distributor') {
      setIsDelivery(false);
      setDeliveryDate(new Date());
    }
  }, [selectedType]); // Only run when selectedType changes
  
  // Effect for handling customer selection
  useEffect(() => {
    // Only run this effect when selectedCustomer changes
    if (selectedCustomer) {
      // If selected customer is a distributor, disable delivery
      if (selectedCustomer.type && selectedCustomer.type.toLowerCase() === 'distributor') {
        setIsDelivery(false);
      }
      
      // Refetch stock data with new customer selection
      fetchStockData();
    }
  }, [selectedCustomer]);

  // Reset form when component regains focus
  useFocusEffect(
    useCallback(() => {
      // Reset the form state when screen is focused
      resetForm();
      fetchStockData(); // Re-fetch stock items to get latest inventory
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Data fetching functions
  const fetchStockData = async () => {
    try {
      // First, get all products from the products table
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          product_name,
          factory_price,
          godown_price,
          delivery_price,
          discount_price,
          product_sn
        `)
        .order('product_sn');

      if (productsError) throw productsError;

      // Then, get stock quantities from the appropriate stock table
      const stockTable = selectedType === 'Distributor' ? 'factory_stock' : 'godown_stock';
      const { data: stockData, error: stockError } = await supabase
        .from(stockTable)
        .select('*');

      if (stockError) throw stockError;

      // Create a map of product_id to its stock quantity
      const stockMap: { [key: string]: number } = {};
      stockData.forEach((item: any) => {
        stockMap[item.product_id] = item.quantity || 0;
      });

      // Determine the price based on customer type, discount status, and delivery status
      const getPriceForItem = (product: any) => {
        // If discount customer and discount price is available, use discount price
        if (isDiscountCustomer && product.discount_price != null) {
          return product.discount_price;
        }
        
        // Otherwise use standard pricing logic
        if (selectedType === 'Distributor') {
          return product.factory_price;
        } else if (isDelivery) {
          return product.delivery_price || product.godown_price;
        } else {
          return product.godown_price;
        }
      };

      // Create the final list of items with all products, even those with zero stock
      const items = productsData.map((product: any) => ({
        id: product.id,
        product_id: product.id,
        product_name: product.product_name,
        quantity: stockMap[product.id] || 0, // Use 0 if no stock found
        price: getPriceForItem(product),
        product_sn: product.product_sn
      }));

      setStockItems(items);
    } catch (err: any) {
      console.error('Error fetching stock data:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const isDistributor = selectedType === 'Distributor';
      // console.log("Fetching customers with isDistributor =", isDistributor);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('is_distributor', isDistributor as any);

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        Alert.alert(
          'No Customers Found',
          `No ${selectedType.toLowerCase()}s found in the database. Please add some customers first.`
        );
      } else {
        // console.log(`Found ${data.length} customers of type ${selectedType}`);
      }
      
      setCustomers((data || []) as any);
    } catch (err: any) {
      console.error('Error in fetchCustomers:', err);
      Alert.alert('Error', 'Failed to fetch customers. Please try again.');
    }
  };

  // Event handlers
  const handleQuantityChange = (index: number, value: string) => {
    const quantity = parseInt(value) || 0;
    updateOrderItemQuantity(index, quantity);
  };

  const incrementQuantity = (index: number) => {
    const currentQty = orderItems[index]?.quantity || 0;
    updateOrderItemQuantity(index, currentQty + 1);
  };

  const decrementQuantity = (index: number) => {
    const currentQty = orderItems[index]?.quantity || 0;
    if (currentQty > 0) {
      updateOrderItemQuantity(index, currentQty - 1);
    }
  };

  const updateOrderItemQuantity = (index: number, quantity: number) => {
    const stockItem = stockItems[index];
    const stockSource = selectedType === 'Distributor' ? 'factory' : 'godown';
    
    // Prevent ordering more than available stock
    if (quantity > stockItem.quantity) {
      Alert.alert(
        'Insufficient Stock', 
        `Only ${stockItem.quantity} units available in ${stockSource} stock for ${stockItem.product_name}.`
      );
      return;
    }
    
    const newOrderItems = [...orderItems];
    newOrderItems[index] = {
      ...newOrderItems[index],
      quantity,
      total: quantity * stockItems[index].price
    };
    setOrderItems(newOrderItems);
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method === paymentMethod ? null : method);
  };

  const handleCustomerSelect = (customer: Customer) => {
    // console.log("Selected customer:", customer);
    // console.log("Customer type:", customer.type || 'undefined');
    // console.log("Is distributor:", customer.type ? customer.type.toLowerCase() === 'distributor' : false);
    
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
  };

  // Calculations
  const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);

  // Form validation
  const validateForm = () => {
    // For Quick sales, don't require customer information
    if (selectedType !== 'Quick' && !isExistingCustomer && (!customerName || !customerPhone || !customerAddress)) {
      return { isValid: false, message: 'Please fill in all customer details' };
    }

    // For Quick sales, automatically set payment method to Cash if not selected
    if (selectedType === 'Quick' && !paymentMethod) {
      setPaymentMethod('Cash');
    }

    // Only validate payment method if not a delivery, not a distributor, and not a Quick sale
    const isDistributor = selectedType === 'Distributor' || (selectedCustomer && selectedCustomer.type && selectedCustomer.type.toLowerCase() === 'distributor');
    if (!isDelivery && !isDistributor && selectedType !== 'Quick' && !paymentMethod) {
      return { isValid: false, message: 'Please select a payment method' };
    }

    const hasItems = orderItems.some(item => item.quantity > 0);
    if (!hasItems) {
      return { isValid: false, message: 'Please add at least one item to the order' };
    }

    // Enhanced stock validation with better error messages
    const stockSource = selectedType === 'Distributor' ? 'factory' : 'godown';
    const insufficientItems = orderItems
      .filter(item => item.quantity > 0)
      .filter(item => {
        const stockItem = stockItems.find(stock => stock.product_name === item.size);
        return !stockItem || stockItem.quantity < item.quantity;
      })
      .map(item => item.size);

    if (insufficientItems.length > 0) {
      return { 
        isValid: false, 
        message: `Insufficient ${stockSource} stock for: ${insufficientItems.join(', ')}` 
      };
    }

    return { isValid: true, message: '' };
  };

  // Determine the correct customer type
  const getCustomerType = () => {
    if (isExistingCustomer && selectedCustomer && selectedCustomer.type) {
      return selectedCustomer.type.toLowerCase(); 
    }
    return selectedType.toLowerCase();
  };

  // Main sale creation function
  const handleCreateSale = async () => {
    try {
      setIsLoading(true);
      
      // Validate form first
      const validationResult = validateForm();
      if (!validationResult.isValid) {
        Alert.alert('Validation Error', validationResult.message);
        setIsLoading(false);
        return;
      }
      
      // Prepare customer info
      let customerInfo: {
        id?: string;
        name: string;
        phone: string;
        address: string;
      } = {
        name: customerName || 'Walk-in Customer',
        phone: customerPhone || '',
        address: customerAddress || ''
      };
      
      if (selectedCustomer) {
        customerInfo = {
          id: selectedCustomer.id,
          name: selectedCustomer.name || '',
          phone: selectedCustomer.contact_number || selectedCustomer.phone || '',
          address: selectedCustomer.address || ''
        };
      }
      
      const selectedPaymentMethod = paymentMethod;
      
      // Prepare sale data
      const saleData = {
        saleType: selectedType,
        customerInfo,
        saveCustomer: saveToCustomerDB,
        paymentMethod: selectedPaymentMethod?.toLowerCase() || 'cash',
        isDelivery,
        deliveryDate: isDelivery ? deliveryDate : null,
        items: orderItems,
        totalAmount,
        saleDate: new Date()
      };
      
      // Call createSale function
      const { success, message, saleId } = await createSale(saleData);
      
      if (success) {
        const successMessage = `Sale created successfully${message ? `: ${message}` : ''}`;
        
        // Navigate to receipt view
        router.push(`/sales/receipt?saleId=${saleId}`);
      } else {
        Alert.alert('Error', message || 'Failed to create sale');
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Enhanced resetForm function
  const resetForm = () => {
    // Reset customer information
    setSelectedType('Customer');
    setIsExistingCustomer(false);
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    
    // Reset payment and delivery information
    setPaymentMethod(null);
    setIsDelivery(false);
    setDeliveryDate(new Date());
    setSaveToCustomerDB(false);
    setIsDiscountCustomer(false);
    
    // Reset UI state
    setShowCustomerDropdown(false);
    setIsLoading(false);
    
    // Reset order items and refresh stock data
    setOrderItems([]);
    
    // Scroll to the top
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
    }
  };

  // Helper function to create a sale
  const createSale = async (saleData: {
    saleType: string;
    customerInfo: {
      id?: string;
      name: string;
      phone: string;
      address: string;
    };
    saveCustomer?: boolean;
    items: Array<{
      size: string;
      quantity: number;
      price: number;
    }>;
    isDelivery: boolean;
    deliveryDate: Date | null;
    paymentMethod: string;
    totalAmount: number;
  }) => {
    try {
      // 1. Create customer if needed
      let customerId = null;
      
      if (saleData.saleType !== 'Quick') {
        if (!saleData.customerInfo.id) {
          // Create new customer
          const shouldSaveCustomer = saleData.saveCustomer || saleData.saleType === 'Distributor';
          
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: saleData.customerInfo.name,
              contact_person: saleData.customerInfo.name,
              contact_number: saleData.customerInfo.phone,
              address: saleData.customerInfo.address,
              type: saleData.saleType.toLowerCase() === 'distributor' ? 'distributor' : 'customer',
              is_distributor: saleData.saleType.toLowerCase() === 'distributor',
              is_active: shouldSaveCustomer,
              current_balance: 0,
              credit_limit: saleData.saleType.toLowerCase() === 'distributor' ? 50000 : 10000,
              is_discount_customer: isDiscountCustomer,
              notes: shouldSaveCustomer ? 
                `Added via sales form on ${new Date().toLocaleString()}` : 
                `Temporary customer - not saved to database`
            })
            .select()
            .single();

          if (customerError) {
            return { success: false, message: `Failed to create customer: ${customerError.message}` };
          }
          
          customerId = customerData.id;
        } else {
          customerId = saleData.customerInfo.id;
        }
      }

      // 2. Filter items with quantity > 0
      const itemsToProcess = saleData.items.filter((item: {
        size: string;
        quantity: number;
        price: number;
      }) => item.quantity > 0);
      
      if (itemsToProcess.length === 0) {
        return { success: false, message: "No items selected for purchase" };
      }
      
      // 3. Set payment method
      let effectivePaymentMethod;
      const isDistributor = saleData.saleType === 'Distributor';
      
      if (saleData.isDelivery) {
        effectivePaymentMethod = 'cash'; // Default for deliveries
      } else if (isDistributor) {
        effectivePaymentMethod = 'credit'; // Default for distributors
      } else {
        // Ensure payment method is lowercase and map to valid enum values
        if (saleData.paymentMethod === 'UPI' || saleData.paymentMethod === 'NEFT') {
          effectivePaymentMethod = saleData.paymentMethod.toLowerCase();
        } else {
          effectivePaymentMethod = saleData.paymentMethod?.toLowerCase() || 'cash';
        }
      }
      
      // For Quick sales, always use cash as payment method
      if (saleData.saleType === 'Quick') {
        effectivePaymentMethod = 'cash';
      }
      
      // 4. Generate invoice number in format "INV/2526-MM-XXX"
      const currentDate = new Date();
      const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero (MM)
      
      // Get count of sales in the current month to determine the sequential number
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
      
      const { count: monthlyCount, error: countError } = await supabase
        .from('sales')
        .select('id', { count: 'exact' })
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);
        
      if (countError) {
        console.warn('Error getting monthly sales count:', countError);
      }
      
      // Format the sequential number with leading zeros (001, 002, etc.) - using 3 digits
      const sequentialNumber = ((monthlyCount || 0) + 1).toString().padStart(3, '0');
      
      // Generate invoice number in the format INV/2526-MM-XXX as requested
      const invoiceNumber = `INV/2526-${currentMonth}-${sequentialNumber}`;
      
      // Determine verification status - cash payments are auto-verified unless it's a delivery
      const isVerified = !saleData.isDelivery && effectivePaymentMethod === 'cash';
      
      // 5. Verify stock availability one more time before creating the sale
      const stockTable = saleData.saleType === 'Distributor' ? 'factory_stock' : 'godown_stock';
      const stockSource = saleData.saleType === 'Distributor' ? 'factory' : 'godown';
      
      // Get current stock levels to ensure they haven't changed since page load
      const { data: currentStock, error: stockQueryError } = await supabase
        .from(stockTable)
        .select('*');
        
      if (stockQueryError) {
        return { success: false, message: `Failed to verify current stock levels: ${stockQueryError.message}` };
      }
      
      // Create a map of product_id to current stock quantity
      const stockMap: { [key: string]: number } = {};
      currentStock.forEach((item: any) => {
        stockMap[item.product_id] = item.quantity || 0;
      });
      
      // Verify all items have sufficient stock
      const insufficientItems = [];
      for (const item of itemsToProcess) {
        const stockItem = stockItems.find(s => s.product_name === item.size);
        if (!stockItem) {
          insufficientItems.push(item.size);
          continue;
        }
        
        const currentQuantity = stockMap[stockItem.product_id] || 0;
        if (currentQuantity < item.quantity) {
          insufficientItems.push(`${item.size} (requested: ${item.quantity}, available: ${currentQuantity})`);
        }
      }
      
      if (insufficientItems.length > 0) {
        return { 
          success: false, 
          message: `Cannot complete sale. Insufficient ${stockSource} stock for: ${insufficientItems.join(', ')}` 
        };
      }
      
      // 6. Create the sale record
      const saleRecord = {
        customer_id: customerId,
        payment_method: effectivePaymentMethod,
        total_amount: saleData.totalAmount,
        status: saleData.isDelivery ? 'pending' : 'completed',
        delivery: saleData.isDelivery,
        delivery_date: saleData.deliveryDate ? saleData.deliveryDate.toISOString() : null,
        verified: isVerified,
        type: saleData.saleType.toLowerCase(),
        invoice_number: invoiceNumber
      };
      
      const { data: createdSale, error: saleError } = await supabase
        .from('sales')
        .insert(saleRecord)
        .select()
        .single();
        
      if (saleError) {
        return { success: false, message: `Failed to create sale record: ${saleError.message}` };
      }
      
      const saleId = createdSale.id;
      
      // 7. Process items, update stock, and add them to sale_items table
      const successfulItems = [];
      const failedItems = [];
      
      // Process each item in a transaction-like manner
      for (const item of itemsToProcess) {
        try {
          const stockItem = stockItems.find(stock => stock.product_name === item.size);
          if (!stockItem) {
            failedItems.push({name: item.size, reason: 'Stock item not found'});
            continue;
          }
          
          // Get the latest stock quantity to ensure it's current
          const { data: latestStock, error: stockGetError } = await supabase
            .from(stockTable)
            .select('quantity')
            .eq('product_id', stockItem.product_id)
            .single();
            
          if (stockGetError) {
            failedItems.push({name: item.size, reason: `Failed to get current stock: ${stockGetError.message}`});
            continue;
          }
          
          const currentStockQty = latestStock.quantity || 0;
          
          // Verify there's enough stock
          if (currentStockQty < item.quantity) {
            failedItems.push({
              name: item.size, 
              reason: `Insufficient stock (needed: ${item.quantity}, available: ${currentStockQty})`
            });
            continue;
          }
          
          // Create sale_item
          const { error: insertError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: saleId,
              product_id: stockItem.product_id,
              quantity: item.quantity,
              price: item.price,
              total_price: item.price * item.quantity,
              invoice_number: invoiceNumber
            });
          
          if (insertError) {
            failedItems.push({name: item.size, reason: insertError.message});
            continue;
          }
          
          // Update stock quantity
          const newQuantity = currentStockQty - item.quantity;
          
          const { error: stockUpdateError } = await supabase
            .from(stockTable)
            .update({ quantity: newQuantity })
            .eq('product_id', stockItem.product_id);
          
          if (stockUpdateError) {
            console.error(`Error updating stock for ${item.size}:`, stockUpdateError);
            failedItems.push({
              name: item.size, 
              reason: `Failed to update stock: ${stockUpdateError.message}`
            });
            continue;
          }
          
          successfulItems.push(item.size);
        } catch (error) {
          failedItems.push({name: item.size, reason: error instanceof Error ? error.message : 'Unknown error'});
        }
      }
      
      // If any items failed, delete the sale and return error
      if (failedItems.length > 0) {
        // Try to delete the sale to rollback
        try {
          await supabase.from('sale_items').delete().eq('sale_id', saleId);
          await supabase.from('sales').delete().eq('id', saleId);
        } catch (rollbackError) {
          console.error('Error rolling back sale:', rollbackError);
        }
        
        return {
          success: false,
          message: `Sale failed: ${failedItems.map(item => `${item.name} (${item.reason})`).join(', ')}`
        };
      }
      
      // Return result
      return {
        success: true,
        message: '',
        saleId
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };

  // Option for toggling delivery status
  const toggleDelivery = () => {
    const newDeliveryState = !isDelivery;
    setIsDelivery(newDeliveryState);
    
    // If switching to delivery, clear payment method
    if (newDeliveryState) {
      setPaymentMethod(null);
    } else {
      // Reset delivery date when turning off delivery
      setDeliveryDate(new Date());
    }
    
    // Refetch stock data with new delivery status
    fetchStockData();
  };

  // Handler for date change
  const handleDeliveryDateChange = (event: any, selectedDate: Date | undefined) => {
    // Hide date picker on Android after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setDeliveryDate(selectedDate);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // UI Rendering
  return (
    <View style={styles.container}>
      <PageTitleBar title="Sales" showBack={false} />
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        contentContainerStyle={{paddingBottom: 120}}
        keyboardShouldPersistTaps="handled"
      >
        {/* Customer selection dropdown - rendered at root level */}
        
        {/* Customer type selection */}
        <View style={styles.customerTypeContainer}>
          {(['Customer', 'Distributor', 'Quick'] as CustomerType[]).map((type: CustomerType) => (
            <Pressable
              key={type}
              style={[
                styles.customerTypeButton,
                type === selectedType && styles.customerTypeButtonActive,
              ]}
              onPress={() => setSelectedType(type)}>
              <Text
                style={[
                  styles.customerTypeText,
                  type === selectedType && styles.customerTypeTextActive,
                ]}>
                {type === 'Quick' ? 'Quick Sale' : type}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Customer information section */}
        {selectedType !== 'Quick' ? (
          <View style={styles.formSection}>
            <View style={styles.checkboxContainer}>
              <Pressable
                style={{flexDirection: 'row', alignItems: 'center'}}
                onPress={() => {
                  setIsExistingCustomer(!isExistingCustomer);
                  if (!isExistingCustomer) {
                    setSelectedCustomer(null);
                  }
                }}>
                <View 
                  style={[
                    styles.checkbox, 
                    isExistingCustomer && styles.checkboxChecked
                  ]}>
                  {isExistingCustomer && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.checkboxLabel}>
                  {selectedType === 'Distributor' ? 'Existing Distributor' : 'Existing Customer'}
                </Text>
              </Pressable>
              
              <View style={styles.checkboxSpacer} />
              
              {/* Only show delivery checkbox if not a Distributor */}
              {(selectedType !== 'Distributor' && !(selectedCustomer && selectedCustomer.type && selectedCustomer.type.toLowerCase() === 'distributor')) && (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Pressable 
                    style={{flexDirection: 'row', alignItems: 'center'}}
                    onPress={toggleDelivery}>
                    <View 
                      style={[styles.checkbox, isDelivery && styles.checkboxChecked]}>
                      {isDelivery && <View style={styles.checkboxInner} />}
                    </View>
                    <Text style={styles.checkboxLabel}>Delivery</Text>
                  </Pressable>
                  
                  {/* Date picker appears when delivery is checked */}
                  {isDelivery && (
                    <View style={styles.deliveryDateContainer}>
                      <Text style={styles.deliveryDateLabel}>On:</Text>
                      
                      {/* Date display and button for Android */}
                      <Pressable 
                        style={styles.datePickerButton}
                        onPress={() => setShowDatePicker(true)}>
                        <Text style={styles.dateText}>
                          {formatDate(deliveryDate)}
                        </Text>
                        <Calendar size={16} color="#666" style={{ marginLeft: 5 }} />
                      </Pressable>
                      
                      {/* Date picker - visible inline on iOS, as modal on Android */}
                      {Platform.OS === 'ios' ? (
                        <DateTimePicker
                          value={deliveryDate}
                          mode="date"
                          display="default"
                          onChange={handleDeliveryDateChange}
                          minimumDate={new Date()}
                          style={styles.datePicker}
                        />
                      ) : showDatePicker && (
                        <DateTimePicker
                          value={deliveryDate}
                          mode="date"
                          display="default"
                          onChange={handleDeliveryDateChange}
                          minimumDate={new Date()}
                        />
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>

            {isExistingCustomer ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Select Customer</Text>
                  <View style={styles.customerDropdownContainer}>
                    <Pressable
                      ref={dropdownButtonRef}
                      style={styles.customerDropdown}
                      onPress={toggleDropdown}>
                      <Text style={styles.customerDropdownText}>
                        {selectedCustomer ? selectedCustomer.name : 'Select a customer'}
                      </Text>
                      <ChevronDown size={20} color="#666" />
                    </Pressable>

                    <Modal
                      transparent={true}
                      visible={showCustomerDropdown}
                      animationType="none"
                      onRequestClose={() => setShowCustomerDropdown(false)}
                    >
                      <TouchableWithoutFeedback 
                        onPress={() => setShowCustomerDropdown(false)}
                      >
                        <View style={styles.modalOverlay}>
                          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={[
                              styles.dropdownModalContent,
                              { top: dropdownPosition.top, left: dropdownPosition.left, width: dropdownPosition.right - dropdownPosition.left }
                            ]}>
                              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
                                {customers.length > 0 ? (
                                  customers.map((customer) => (
                                    <Pressable
                                      key={customer.id}
                                      style={styles.dropdownItem}
                                      onPress={() => handleCustomerSelect(customer)}>
                                      <Text style={styles.dropdownItemText}>{customer.name}</Text>
                                      <View style={styles.dropdownItemDetails}>
                                        <Text style={styles.dropdownItemPhone}>{customer.phone || customer.contact_number || 'No phone'}</Text>
                                        <Text style={[
                                          styles.dropdownItemType,
                                          customer.type && customer.type.toLowerCase() === 'distributor' && styles.distributorType
                                        ]}>
                                          {customer.type || 'Customer'}
                                        </Text>
                                      </View>
                                    </Pressable>
                                  ))
                                ) : (
                                  <View style={styles.emptyDropdown}>
                                    <Text style={styles.emptyDropdownText}>No customers found</Text>
                                  </View>
                                )}
                              </ScrollView>
                            </View>
                          </TouchableWithoutFeedback>
                        </View>
                      </TouchableWithoutFeedback>
                    </Modal>
                  </View>
                </View>

                {/* Is Discount Customer Checkbox for existing customers */}
                <View style={styles.checkboxContainer}>
                  <Pressable 
                    style={styles.saveCustomerCheckbox}
                    onPress={() => setIsDiscountCustomer(!isDiscountCustomer)}>
                    <View style={[
                      styles.checkbox,
                      isDiscountCustomer && styles.checkboxChecked
                    ]}>
                      {isDiscountCustomer && <View style={styles.checkboxInner} />}
                    </View>
                    <Text style={[styles.checkboxLabel, {fontWeight: '500', marginLeft: 8}]}>
                      Is Discount Customer
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View>
                <View style={styles.rowContainer}>
                  <View style={styles.halfWidthInput}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter customer name"
                      placeholderTextColor="#999"
                      value={customerName}
                      onChangeText={setCustomerName}
                    />
                  </View>

                  <View style={styles.halfWidthInput}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="1234567890"
                      keyboardType="numeric"
                      maxLength={10}
                      placeholderTextColor="#999"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter customer address"
                    multiline
                    numberOfLines={4}
                    placeholderTextColor="#999"
                    value={customerAddress}
                    onChangeText={setCustomerAddress}
                  />
                </View>
                
                {/* Add to Customer Database Checkbox */}
                <View style={styles.checkboxContainer}>
                  <Pressable 
                    style={styles.saveCustomerCheckbox}
                    onPress={() => setSaveToCustomerDB(!saveToCustomerDB)}>
                    <View style={[
                      styles.checkbox,
                      saveToCustomerDB && styles.checkboxChecked
                    ]}>
                      {saveToCustomerDB && <View style={styles.checkboxInner} />}
                    </View>
                    <Text style={[styles.checkboxLabel, {fontWeight: '500', marginLeft: 8}]}>
                      Add to {selectedType === 'Distributor' ? 'Distributor' : 'Customer'} Database
                    </Text>
                  </Pressable>
                  
                  <View style={styles.checkboxSpacer} />
                  
                  <Pressable 
                    style={styles.saveCustomerCheckbox}
                    onPress={() => setIsDiscountCustomer(!isDiscountCustomer)}>
                    <View style={[
                      styles.checkbox,
                      isDiscountCustomer && styles.checkboxChecked
                    ]}>
                      {isDiscountCustomer && <View style={styles.checkboxInner} />}
                    </View>
                    <Text style={[styles.checkboxLabel, {fontWeight: '500', marginLeft: 8}]}>
                      Is Discount Customer
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : (
          // Quick Sale simplified view
          <View style={styles.formSection}>
            <View style={styles.rowContainer}>
              <View style={styles.halfWidthInput}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value="Quick"
                  editable={false}
                />
              </View>
              <View style={styles.halfWidthInput}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value="1111111111"
                  editable={false}
                />
              </View>
            </View>
          </View>
        )}

        {/* Order details section */}
        <View style={styles.orderDetails}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          
          <View style={styles.orderTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.itemCell]}>Item</Text>
              <Text style={[styles.headerCell, styles.stockCell]}>Stock</Text>
              <Text style={[styles.headerCell, styles.priceCell]}>
                {isDiscountCustomer && <Text style={styles.priceTypeIndicator}>Discount</Text>}
                {!isDiscountCustomer && isDelivery && <Text style={styles.priceTypeIndicator}>Delivery</Text>}
                {!isDiscountCustomer && !isDelivery && selectedType === 'Distributor' && <Text style={styles.priceTypeIndicator}>Factory</Text>}
                {!isDiscountCustomer && !isDelivery && selectedType !== 'Distributor' && <Text style={styles.priceTypeIndicator}>Godown</Text>}
              </Text>
              <Text style={[styles.headerCell, styles.qtyCell]}>Qty</Text>
              <Text style={[styles.headerCell, styles.totalCell]}>Total</Text>
            </View>

            {stockItems.map((item, index) => (
              <View key={item.id} style={[
                styles.tableRow,
                index % 2 === 0 ? styles.evenRow : styles.oddRow
              ]}>
                <Text style={[styles.cell, styles.itemCell]}>{item.product_name}</Text>
                <Text style={[styles.cell, styles.stockCell]}>{item.quantity}</Text>
                <Text style={[styles.cell, styles.priceCell]}>₹{item.price}</Text>
                <View style={[styles.qtyCell, styles.quantityContainer]}>
                  <Pressable 
                    style={styles.quantityButton} 
                    onPress={() => decrementQuantity(index)}>
                    <Text style={styles.quantityButtonText}>-</Text>
                  </Pressable>
                  
                  <TextInput
                    style={styles.quantityInput}
                    value={orderItems[index]?.quantity > 0 ? orderItems[index].quantity.toString() : ''}
                    onChangeText={(value) => handleQuantityChange(index, value)}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                    blurOnSubmit={false}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  
                  <Pressable 
                    style={styles.quantityButton} 
                    onPress={() => incrementQuantity(index)}>
                    <Text style={styles.quantityButtonText}>+</Text>
                  </Pressable>
                </View>
                <Text style={[styles.cell, styles.totalCell]}>₹{orderItems[index]?.total || 0}</Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { flex: 5.2 }]}>Total Amount</Text>
              <View style={{flex: 1, alignItems: 'center', paddingRight: 10}}>
                <Text style={styles.totalAmount}>₹{totalAmount}</Text>
              </View>
            </View>
          </View>

          {/* Payment method selection - only show if not a distributor and not a delivery */}
          {(!isDelivery && (selectedType !== 'Distributor' && !(selectedCustomer && selectedCustomer.type && selectedCustomer.type.toLowerCase() === 'distributor'))) && (
            <View style={styles.paymentMethod}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.checkboxGroup}>
                <Pressable 
                  style={styles.checkboxOption}
                  onPress={() => handlePaymentMethodSelect('Cash')}>
                  <View style={[
                    styles.checkbox,
                    paymentMethod === 'Cash' && styles.cashBadge,
                    paymentMethod === 'Cash' && styles.badgeBase
                  ]}>
                    {paymentMethod === 'Cash' && <View style={styles.badgeInner} />}
                  </View>
                  <Text style={styles.checkboxLabel}>Cash</Text>
                </Pressable>
                <Pressable 
                  style={styles.checkboxOption}
                  onPress={() => handlePaymentMethodSelect('Credit')}>
                  <View style={[
                    styles.checkbox,
                    paymentMethod === 'Credit' && styles.creditBadge,
                    paymentMethod === 'Credit' && styles.badgeBase
                  ]}>
                    {paymentMethod === 'Credit' && <View style={styles.badgeInner} />}
                  </View>
                  <Text style={styles.checkboxLabel}>Credit</Text>
                </Pressable>
                <Pressable 
                  style={styles.checkboxOption}
                  onPress={() => handlePaymentMethodSelect('UPI')}>
                  <View style={[
                    styles.checkbox,
                    paymentMethod === 'UPI' && styles.upiBadge,
                    paymentMethod === 'UPI' && styles.badgeBase
                  ]}>
                    {paymentMethod === 'UPI' && <View style={styles.badgeInner} />}
                  </View>
                  <Text style={styles.checkboxLabel}>UPI</Text>
                </Pressable>
                <Pressable 
                  style={styles.checkboxOption}
                  onPress={() => handlePaymentMethodSelect('NEFT')}>
                  <View style={[
                    styles.checkbox,
                    paymentMethod === 'NEFT' && styles.neftBadge,
                    paymentMethod === 'NEFT' && styles.badgeBase
                  ]}>
                    {paymentMethod === 'NEFT' && <View style={styles.badgeInner} />}
                  </View>
                  <Text style={styles.checkboxLabel}>NEFT</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Create Sale button */}
        <Pressable 
          style={[styles.createButton, isLoading && styles.createButtonDisabled]}
          onPress={handleCreateSale}
          disabled={isLoading}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Text style={styles.createButtonText}>
            {isLoading ? 'Creating Sale...' : 'Create Sale'}
          </Text>
        </Pressable>
        
        {/* Sales History button */}
        <Pressable 
          style={[styles.historyButton]}
          onPress={() => router.push('/sales/history')}>
          <Text style={styles.historyButtonText}>Sales History</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingBottom: 30,
  },
  content: {
    padding: 4,
  },
  customerTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#90A4AE',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
    width: '80%',
    alignSelf: 'center',
  },
  customerTypeButton: {
    flex: 1,
    paddingVertical: 2,
    alignItems: 'center',
    borderRadius: 8,
  },
  customerTypeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  customerTypeText: {
    color: '#666',
    fontWeight: '400',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
  },
  customerTypeTextActive: {
    color: '#2980b9',
    fontWeight: '400',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
    marginBottom: 12,
    paddingLeft: 12,
    color: '#2B7BB0',
    paddingTop: 6,

  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#90A4AE',
    backgroundColor: '#fff',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#00a651',
    backgroundColor: '#fff',
  },
  checkboxInner: {
    width: 14,
    height: 8,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#00a651',
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  checkboxLabel: {
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  halfWidthInput: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  customerDropdownContainer: {
    position: 'relative',
    zIndex: 9999,
    elevation: 999,
  },
  customerDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    zIndex: 9999,
    elevation: 999,
  },
  customerDropdownText: {
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
  },
  selectedCustomerInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f7fc',
    borderRadius: 4,
  },
  customerInfoText: {
    color: '#333',
    marginBottom: 5,
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
  },
  orderDetails: {
    marginTop: 0,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderTable: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#90A4AE',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  headerCell: {
    color: '#fff',
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  cell: {
    color: '#333',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
  },
  itemCell: {
    flex: 1,
    paddingHorizontal: 10,
    textAlign: 'left',
  },
  stockCell: {
    flex: 1,
  },
  priceCell: {
    flex: 1,
  },
  qtyCell: {
    flex: 2.2,
    alignItems: 'center',
  },
  totalCell: {
    flex: 1,
    textAlignVertical: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    width: 34,
    height: 34,
    backgroundColor: '#fff',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#c7c7c7',

    
    
  },
  quantityButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
    textAlign: 'center',
  },
  quantityInput: {
    width: 35,
    height: 35,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#2980b9',
    borderRadius: 4,
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f7f9fa',
    paddingVertical: 2,
    paddingHorizontal: 15,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#e0e6ed',
  },
  totalLabel: {
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
  },
  totalAmount: {
    color: '#2980b9',
    textAlign: 'center',
    flex: 1,
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  paymentMethod: {
    marginBottom: 4,
  },
  checkboxSpacer: {
    width: 20,
  },
  checkboxGroup: {
    flexDirection: 'row',
    marginTop: 5,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  createButton: {
    backgroundColor: '#2980b9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  createButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '400',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginHorizontal: 4,
    borderRadius: 4,
  },
  dropdownItemText: {
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dropdownItemPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  dropdownItemType: {
    fontSize: 14,
    color: '#2980b9',
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: 'bold',
  },
  distributorType: {
    color: '#e74c3c',
  },
  historyButton: {
    backgroundColor: '#34495e',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  textDisabled: {
    color: '#999',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
    color: '#999',
  },
  upiBadge: {
    backgroundColor: '#fff',
    borderColor: '#00a651',
  },
  neftBadge: {
    backgroundColor: '#fff',
    borderColor: '#00a651',
  },
  cashBadge: {
    backgroundColor: '#fff',
    borderColor: '#00a651',
  },
  creditBadge: {
    backgroundColor: '#fff', 
    borderColor: '#00a651',
  },
  badgeBase: {
    borderWidth: 2,
    borderColor: '#00a651',
    backgroundColor: '#fff',
  },
  badgeInner: {
    width: 12,
    height: 8,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#00a651',
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
    borderRadius: 0,
  },
  saveCustomerCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  checkField: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdownModalContent: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  evenRow: {
    backgroundColor: '#f0f7fc',
  },
  oddRow: {
    backgroundColor: '#fff',
  },
  emptyDropdown: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDropdownText: {
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 14,
    fontStyle: 'italic',
  },
  priceTypeIndicator: {
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 4,
    overflow: 'hidden',
  },
  deliveryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  deliveryDateLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
    fontFamily: 'AsapCondensed_400Regular',
  },
  datePicker: {
    width: 120,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
});