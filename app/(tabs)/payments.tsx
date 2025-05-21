import PageTitleBar from '@/components/PageTitleBar';
import PaymentModal from '@/components/PaymentModal';
import useScreenTransition from '@/hooks/useScreenTransition';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Banknote, Check, ChevronLeft, ChevronRight, Clock, CreditCard } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

// Debug the Supabase connection first
const debugSupabase = async () => {
  try {
    console.log("Checking Supabase connection...");
    console.log("Supabase URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);
    
    // First check if we have the environment variables properly set
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables");
      return false;
    }
    
    // Add timeout to prevent hanging if network is down
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Database connection timeout after 5 seconds")), 5000);
    });
    
    // Test a simple query that should work on any Supabase project
    const queryPromise = supabase.from('customers').select('count');
    
    // Race between timeout and actual query
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) {
      console.error("Database connection error:", error.message);
      console.error("Error details:", error);
      return false;
    }
    
    console.log("Database connection successful!");
    return true;
  } catch (err: any) {
    console.error("Supabase client error:", err?.message || err);
    return false;
  }
};

interface PaymentDue {
  id: string;
  name: string;
  phone: string;
  amount: number;
  customer_id: string;
  sale_date?: string;
  payment_method?: string;
  delivery?: boolean;
  original_amount?: number;
  paid_amount?: number;
  is_partial?: boolean;
}

interface RecentPayment {
  id: string;
  date: string;
  name: string;
  amount: number;
  method: string;
  verified?: boolean;
}

// Safe wrapper for Supabase operations with timeout and error handling
const safeDbOperation = async (operation: string, dbCall: () => any, timeoutMs = 5000) => {
  try {
    console.log(`Executing DB operation: ${operation}`);
    
    // Create a timeout promise that rejects after timeoutMs
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Database operation timed out after ${timeoutMs}ms: ${operation}`)), timeoutMs);
    });
    
    // Race between the actual operation and the timeout
    const result = await Promise.race([dbCall(), timeoutPromise]);
    
    // Check for error in the result
    if (result.error) {
      console.error(`DB operation error (${operation}):`, result.error);
      return { 
        success: false, 
        data: null, 
        error: result.error,
        errorMessage: `Database error: ${result.error.message || 'Unknown error'}`
      };
    }
    
    console.log(`DB operation completed successfully: ${operation}`);
    return { 
      success: true, 
      data: result.data,
      error: null,
      errorMessage: null
    };
  } catch (err: any) {
    console.error(`Exception in DB operation (${operation}):`, err);
    return { 
      success: false, 
      data: null, 
      error: err,
      errorMessage: err?.message || `Unknown error during ${operation}`
    };
  }
};

// Define an interface for the pending verification operation
interface PendingVerification {
  saleId: string;
  timestamp: string;
  data: {
    status: string;
    verified: boolean;
    payment_date: string;
  };
}

export default function PaymentsScreen() {
  const { AnimatedContainer } = useScreenTransition();
  const [selectedPayment, setSelectedPayment] = useState<PaymentDue | null>(null);
  const [paymentsDue, setPaymentsDue] = useState<PaymentDue[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [paidCount, setPaidCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [dueAmount, setDueAmount] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);
  const PAYMENTS_PER_PAGE = 12;

  useEffect(() => {
    // Check DB connection first, then fetch data
    const initializeData = async () => {
      try {
        console.log("Initializing payments data...");
        const connected = await debugSupabase();
        setDbConnected(connected);
        
        if (connected) {
          console.log("Database connected, fetching payment data...");
          await fetchPaymentData();
        } else {
          console.log("Using fallback data due to database connection issues");
          // Set fallback data for UI demonstration
          setPaymentsDue([
            { id: '1', name: 'John Doe', phone: 'N/A', amount: 1500, customer_id: '1' },
            { id: '2', name: 'Jane Smith', phone: 'N/A', amount: 2000, customer_id: '2' },
            { id: '3', name: 'Bob Johnson', phone: 'N/A', amount: 1000, customer_id: '3' },
          ]);
          setTotalDue(4500);
          
          setRecentPayments([
            { id: '1', date: 'Jan 22, 2024', name: 'Sarah Wilson', amount: 450, method: 'Cash' },
            { id: '2', date: 'Jan 21, 2024', name: 'Mike Brown', amount: 900, method: 'Credit' },
            { id: '3', date: 'Jan 20, 2024', name: 'Emily Davis', amount: 750, method: 'Cash' },
          ]);
          
          setPaidCount(12);
          setDueCount(2);
          setOverdueCount(1);
          setDueAmount(2000);
          setOverdueAmount(2500);
          setLoading(false);
          setError("Database connection failed. Using sample data instead. Please check your network connection and Supabase settings.");
        }
      } catch (err: any) {
        console.error("Error initializing data:", err);
        setLoading(false);
        setError(`Initialization error: ${err?.message || "Unknown error"}`);
        
        // Set fallback data in case of any initialization error
        setPaymentsDue([
          { id: '1', name: 'John Doe', phone: 'N/A', amount: 1500, customer_id: '1' },
          { id: '2', name: 'Jane Smith', phone: 'N/A', amount: 2000, customer_id: '2' },
        ]);
        setTotalDue(3500);
        setRecentPayments([
          { id: '1', date: 'Today', name: 'Error Test', amount: 100, method: 'Cash' },
        ]);
        setPaidCount(5);
        setDueCount(2);
        setOverdueCount(0);
        setDueAmount(3500);
        setOverdueAmount(0);
      }
    };
    
    initializeData();
  }, [currentPage]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First validate database connection
      console.log("Validating database connection before fetching payments...");
      const isConnected = await debugSupabase();
      
      if (!isConnected) {
        console.error("Database connection check failed");
        throw new Error("Unable to connect to the database. Check your network connection.");
      }
      
      // Fetch all sales records using the safe wrapper
      console.log("Fetching all sales...");
      const salesResult = await safeDbOperation(
        "fetch-sales", 
        () => supabase
          .from('sales')
          .select(`
            id,
            created_at,
            customer_id,
            total_amount,
            payment_method,
            delivery,
            status,
            verified,
            paid_amount
          `)
          .order('created_at', { ascending: false })
      );
      
      if (!salesResult.success) {
        throw new Error(salesResult.errorMessage || "Failed to fetch sales data");
      }
      
      const allSales = salesResult.data;
      console.log(`Found ${allSales?.length || 0} total sales`);
      
      // Also try to fetch payment records if they exist
      console.log("Checking for payment records...");
      const paymentsResult = await safeDbOperation(
        "fetch-payments",
        () => supabase
          .from('payments')
          .select('*')
      );
      
      let paymentRecords = null;
      if (paymentsResult.success) {
        paymentRecords = paymentsResult.data;
        console.log(`Found ${paymentRecords?.length || 0} payment records`);
      } else {
        console.warn("Could not fetch payment records:", paymentsResult.errorMessage);
      }
      
      // Create a Set of paid sale IDs from the payments table
      const paidSaleIds = new Set();
      if (!paymentsResult.error && paymentRecords) {
        console.log(`Found ${paymentRecords.length} payment records`);
        paymentRecords.forEach((payment: any) => {
          if (payment.sale_id) {
            paidSaleIds.add(payment.sale_id);
          }
        });
        console.log(`Added ${paidSaleIds.size} sales to paid list from payments table`);
      }
      
      // Calculate counts for summary cards
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      
      // Count paid sales
      const paidSales = allSales?.filter((sale: any) => 
        sale.status === 'paid' || sale.verified === true
      ) || [];
      setPaidCount(paidSales.length);
      
      // Filter for pending sales - including sales with partial payments
      const pendingSales = allSales?.filter((sale: any) => {
        // Skip any sales that are already fully paid in the sales table
        if (sale.status === 'paid' && sale.verified === true) {
          return false;
        }
        
        // Include sales with partial payments (where paid_amount exists but less than total_amount)
        if (sale.paid_amount && sale.paid_amount > 0 && sale.paid_amount < sale.total_amount) {
          return true;
        }
        
        // Skip if they're already verified (regardless of payment method)
        if (sale.verified === true) {
          return false;
        }
        
        // Include sales that need verification (not verified yet)
        // regardless of payment method (Cash, Credit, etc.)
        // Skip if it's in our set of fully paid sale IDs
        if (paidSaleIds.has(sale.id)) {
          return false;
        }
        
        // Skip delivery sales that haven't been marked as delivered yet
        if (sale.delivery === true && sale.status !== 'delivered') {
          return false;
        }
        
        // Include all types of sales (Cash, Credit, etc.) that need verification
        return true;
      });
      
      // Split pending sales into due and overdue
      let dueCount = 0;
      let overdueCount = 0;
      let dueAmount = 0;
      let overdueAmount = 0;
      
      pendingSales.forEach((sale: any) => {
        const saleDate = new Date(sale.created_at);
        // Calculate remaining amount for partial payments
        const paidAmount = sale.paid_amount || 0;
        const totalAmount = sale.total_amount || 0;
        const remainingAmount = Math.max(0, totalAmount - paidAmount);
        
        if (saleDate < twoDaysAgo) {
          overdueCount++;
          overdueAmount += remainingAmount;
        } else {
          dueCount++;
          dueAmount += remainingAmount;
        }
      });
      
      setDueCount(dueCount);
      setOverdueCount(overdueCount);
      setDueAmount(dueAmount);
      setOverdueAmount(overdueAmount);
      
      console.log(`Found ${pendingSales?.length || 0} sales needing payment verification`);
      console.log(`Due: ${dueCount}, Overdue: ${overdueCount}, Paid: ${paidSales.length}`);
      console.log("Payment methods included:", pendingSales?.map((s: any) => s.payment_method).join(', '));
      
      // Fetch ALL customers first, regardless of pending sales
      console.log("Fetching all customers for proper name mapping...");
      const { data: allCustomerData, error: allCustomerError } = await supabase
        .from('customers')
        .select('id, name, contact_number, current_balance');
        
      if (allCustomerError) {
        console.error("Error fetching all customers:", allCustomerError);
        throw new Error(`Database error fetching customers: ${allCustomerError.message || 'Unknown error'}`);
      }
      
      // Create a map for quick lookup of all customers
      const customerMap = new Map();
      allCustomerData?.forEach((customer: any) => {
        customerMap.set(customer.id, customer);
      });
      
      console.log(`Fetched ${customerMap.size} total customers for proper name mapping`);
      
      if (pendingSales?.length === 0) {
        console.log("No pending sales found");
        setPaymentsDue([]);
        setTotalDue(0);
        
        // Still fetch completed payments with the full customer map
        const completedPayments = await fetchCompletedPayments(allSales, paymentRecords, customerMap);
        setRecentPayments(completedPayments);
        return;
      }
      
      // Format data for UI display
      const formattedPaymentsDue = pendingSales?.map((sale: any) => {
        // Guard against null/undefined customer_id
        const customerId = sale.customer_id;
        const customer = (customerId && customerMap.get(customerId)) || {
          name: 'Unknown Customer',
          contact_number: 'N/A',
          current_balance: 0
        };
        
        // Calculate remaining amount due for partial payments
        const paidAmount = sale.paid_amount || 0;
        const totalAmount = sale.total_amount || 0;
        const remainingAmount = Math.max(0, totalAmount - paidAmount);
        
        // For partial payments, show the remaining amount instead of the full amount
        const displayAmount = paidAmount > 0 && paidAmount < totalAmount 
          ? remainingAmount 
          : totalAmount;
        
        return {
          id: sale.id,
          name: customer.name,
          phone: customer.contact_number || 'N/A',
          amount: displayAmount,
          original_amount: totalAmount,
          paid_amount: paidAmount,
          customer_id: sale.customer_id || 'unknown',
          sale_date: formatDate(sale.created_at),
          payment_method: sale.payment_method || 'unknown',
          delivery: sale.delivery,
          is_partial: paidAmount > 0 && paidAmount < totalAmount
        };
      }) || [];
      
      // Calculate total due based on remaining amounts
      const total = formattedPaymentsDue.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      
      setPaymentsDue(formattedPaymentsDue);
      setTotalDue(total);
      
      // Fetch completed payments
      const completedPayments = await fetchCompletedPayments(allSales, paymentRecords, customerMap);
      setRecentPayments(completedPayments);
    } catch (err: any) {
      console.error('Error fetching payment data:', err);
      setError(err.message || 'Failed to load payment data. Please check your connection and try again.');
      
      // Clear any previous data to avoid showing stale information
      setPaymentsDue([]);
      setRecentPayments([]);
      setTotalDue(0);
      
      // Use fallback data if this is a connection error
      if (err.message && err.message.includes('connect')) {
        // Set fallback data for demonstration
        setPaymentsDue([
          { id: '1', name: 'John Doe', phone: 'N/A', amount: 1500, customer_id: '1' },
          { id: '2', name: 'Jane Smith', phone: 'N/A', amount: 2000, customer_id: '2' },
          { id: '3', name: 'Bob Johnson', phone: 'N/A', amount: 1000, customer_id: '3' },
        ]);
        setTotalDue(4500);
        
        setRecentPayments([
          { id: '1', date: 'Jan 22, 2024', name: 'Sarah Wilson', amount: 450, method: 'Cash' },
          { id: '2', date: 'Jan 21, 2024', name: 'Mike Brown', amount: 900, method: 'Credit' },
          { id: '3', date: 'Jan 20, 2024', name: 'Emily Davis', amount: 750, method: 'Cash' },
        ]);
        
        setPaidCount(12);
        setDueCount(2);
        setOverdueCount(1);
        setDueAmount(2000);
        setOverdueAmount(2500);
        
        setError("Database connection failed. Using sample data instead.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to fetch and format completed payments
  const fetchCompletedPayments = async (allSales: any[], paymentRecords: any[] | null, customerMap: Map<string, any>) => {
    try {
      // First from sales table - include both paid status and verified=true
      const paidSalesFromTable = allSales?.filter((sale: any) => 
        sale.status === 'paid' || sale.verified === true
      ) || [];
      
      // Then add from payments table if any
      const recentPayments = [...paidSalesFromTable];
      
      if (paymentRecords) {
        // Create a map to avoid duplicates
        const includedSaleIds = new Set(recentPayments.map((sale: any) => sale.id));
        
        // Add payment records that aren't already included
        paymentRecords.forEach((payment: any) => {
          try {
            if (payment.sale_id && !includedSaleIds.has(payment.sale_id)) {
              // Find the matching sale
              if (Array.isArray(allSales)) {
                const matchingSale = allSales.find((sale: any) => {
                  // Make sure sale is valid and has an id
                  return sale && sale.id === payment.sale_id;
                });
                
                if (matchingSale) {
                  recentPayments.push(matchingSale);
                  includedSaleIds.add(matchingSale.id);
                }
              }
            }
          } catch (err) {
            console.error("Error processing payment record:", err);
          }
        });
      }
      
      // Sort by created_at date
      recentPayments.sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Calculate pagination
      const total = recentPayments.length;
      setTotalPayments(total);
      setTotalPages(Math.ceil(total / PAYMENTS_PER_PAGE));
      
      // Get the slice for current page
      const startIndex = (currentPage - 1) * PAYMENTS_PER_PAGE;
      const endIndex = startIndex + PAYMENTS_PER_PAGE;
      const paginatedPayments = recentPayments.slice(startIndex, endIndex);
      
      console.log(`Found ${total} total payments, showing ${paginatedPayments.length} on page ${currentPage}`);
      
      // Format payments data for display
      return paginatedPayments.map((payment: any) => {
        // Try to find customer data, with better fallback for missing customers
        let customerName;
        
        if (payment.type && payment.type.toLowerCase() === 'quick') {
          customerName = 'Quick Sale';
        } else if (payment.customer_id) {
          const customer = customerMap.get(payment.customer_id);
          customerName = customer?.name || 
            (payment.customer_name ? payment.customer_name : 'Unknown Customer');
        } else {
          customerName = payment.customer_name || 'Unknown Customer';
        }
        
        // Cash payments should always be verified
        const isVerified = payment.verified || 
          (payment.method?.toLowerCase() === 'cash' || payment.payment_method?.toLowerCase() === 'cash');
        
        return {
          id: payment.id,
          date: formatDate(payment.created_at || new Date().toISOString()),
          name: customerName,
          amount: payment.total_amount,
          method: payment.payment_method || 'Unknown',
          verified: isVerified
        };
      });
    } catch (err) {
      console.error("Error fetching completed payments:", err);
      return [];
    }
  };

  const formatDate = (dateString: string) => {
    // Parse the date
    const inputDate = new Date(dateString);
    const currentDate = new Date();
    
    // If date is in the future, use current date instead
    const dateToFormat = inputDate > currentDate ? currentDate : inputDate;
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    return dateToFormat.toLocaleDateString('en-US', options);
  };

  const handlePayment = async (paymentToProcess: PaymentDue, amountPaid: number) => {
    try {
      console.log("Payment verification handler called with:", paymentToProcess, "amount paid:", amountPaid);
      console.log("Payment method from modal:", paymentToProcess.payment_method);
      
      // Get access to original and previously paid amounts
      const originalAmount = paymentToProcess.original_amount || paymentToProcess.amount;
      const previouslyPaid = paymentToProcess.paid_amount || 0;
      
      // Determine if this is a full or partial payment
      const totalPaidAfterThisPayment = previouslyPaid + amountPaid;
      const isFullPayment = totalPaidAfterThisPayment >= originalAmount;
      const remainingAmount = isFullPayment ? 0 : originalAmount - totalPaidAfterThisPayment;
      
      console.log("Original amount:", originalAmount, "Previously paid:", previouslyPaid);
      console.log("Amount being paid now:", amountPaid, "Total paid after this payment:", totalPaidAfterThisPayment);
      console.log("Is full payment:", isFullPayment, "Remaining amount:", remainingAmount);
      
      // Don't update UI until we've confirmed the database operation succeeded
      // This prevents UI from showing changes that might revert if database fails
      
      // Add to recent payments only after database success
      const currentDate = new Date();
      const formattedDate = formatDate(currentDate.toISOString());
      
      // Get the current status of the sale to determine proper handling
      console.log("Checking current sale status before updating");
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select('delivery, status, total_amount, paid_amount, payment_method')
        .eq('id', paymentToProcess.id)
        .single();
        
      if (saleError) {
        console.error("Error checking sale details:", saleError);
        throw new Error(`Error checking sale details: ${saleError.message}`);
      }
      
      // Calculate current and new paid amounts
      const currentPaidAmount = saleData?.paid_amount || 0;
      console.log("DB current paid amount:", currentPaidAmount, "Adding payment:", amountPaid);
      const newPaidAmount = currentPaidAmount + amountPaid;
      console.log("New total paid amount will be:", newPaidAmount);
      
      // Determine the correct status to set
      let newStatus;
      let markAsVerified = isFullPayment; // Only mark as verified if full payment
      
      // If it's a delivery item, we need to handle it differently
      if (saleData && (saleData.delivery === true || saleData.delivery === 't')) {
        if (saleData.status !== 'delivered') {
          // Not delivered yet, change to delivered but don't verify
          newStatus = 'delivered';
          markAsVerified = false;
          console.log("Setting delivery item to 'delivered' status (not verified yet)");
        } else {
          // Already delivered, maintain status and verify only if full payment
          newStatus = 'delivered';
          markAsVerified = isFullPayment;
          console.log(`Payment for delivered item: ${isFullPayment ? 'FULL' : 'PARTIAL'}`);
        }
      } else {
        // For regular non-delivery sales, mark as 'paid' only if full payment
        newStatus = isFullPayment ? 'paid' : 'pending';
      }
      
      // ALWAYS use the payment method provided from the modal
      // This ensures that the selected payment method (GPay, Bank Transfer, etc.) is saved
      const finalPaymentMethod = paymentToProcess.payment_method || 'Cash';
      
      console.log("Using payment method for database update:", finalPaymentMethod);
      
      // Update the sale record in the database
      console.log(`Updating sale ID: ${paymentToProcess.id} with status=${newStatus}, verified=${markAsVerified}, paid_amount=${newPaidAmount}, payment_method=${finalPaymentMethod}`);
      
      const { data, error } = await supabase
        .from('sales')
        .update({
          verified: markAsVerified,
          status: newStatus,
          paid_amount: newPaidAmount,
          payment_method: finalPaymentMethod
        })
        .eq('id', paymentToProcess.id)
        .select();
      
      if (error) {
        console.error("Error updating payment status:", error);
        console.error("Error details:", JSON.stringify(error));
        throw new Error(`Failed to process payment: ${error.message}`);
      }
      
      console.log("UPDATE RESPONSE:", data);
      
      // Only update UI after confirming database update was successful
      if (isFullPayment) {
        // If full payment, remove from pending payments
        setPaymentsDue(prev => prev.filter(p => p.id !== paymentToProcess.id));
        setTotalDue(prev => prev - paymentToProcess.amount);
      } else {
        // If partial payment, update the remaining amount in the UI
        setPaymentsDue(prev => prev.map(p => 
          p.id === paymentToProcess.id 
            ? {
                ...p, 
                amount: remainingAmount, 
                payment_method: finalPaymentMethod,
                paid_amount: newPaidAmount,
                is_partial: true
              } 
            : p
        ));
        setTotalDue(prev => prev - amountPaid);
      }
      
      // Add to recent payments list after confirming database update
      const newPayment = {
        id: `${paymentToProcess.id}_${Date.now()}`, // Create a unique ID for partial payments
        date: formattedDate,
        name: paymentToProcess.name || 'Customer',
        amount: amountPaid,
        method: finalPaymentMethod,
        verified: true
      };
      setRecentPayments(prev => [newPayment, ...prev]);
      
      // Show different messages based on full vs partial payment
      if (isFullPayment) {
        Alert.alert('Success', 'Payment verified successfully');
      } else {
        Alert.alert(
          'Partial Payment Recorded', 
          `Payment of ₹${amountPaid.toLocaleString()} recorded. Remaining balance: ₹${remainingAmount.toLocaleString()}`
        );
      }
      
      // Try to record payment in payments table but don't block on failure
      try {
        // Determine the minimal fields that should be present in any payments table
        const minimalPaymentRecord = {
          amount: amountPaid,
          payment_method: finalPaymentMethod,
          sale_id: paymentToProcess.id
        };
        
        // Try to insert with minimal fields first
        console.log("Trying to record minimal payment record with method:", finalPaymentMethod);
        await supabase
          .from('payments')
          .insert(minimalPaymentRecord)
          .throwOnError();
          
        console.log("Successfully recorded minimal payment");
      } catch (error) {
        // Don't throw error or show alert - just log it
        console.log("Could not record payment entry, but main functionality not affected");
        console.error("Payment record error:", error);
      }
      
      // For partial payments, don't immediately refetch data
      if (!isFullPayment) {
        console.log("Partial payment recorded - NOT refreshing data to avoid UI flicker");
        // We've already updated the UI state manually above
      } else {
        // Only refresh for full payments
        console.log("Full payment recorded - refreshing data after delay");
        setTimeout(() => {
          fetchPaymentData();
        }, 500);
      }
      
    } catch (error) {
      console.error("Payment verification error:", error);
      Alert.alert(
        'Error', 
        'Failed to process payment. Please try again.'
      );
      
      // Refresh to reset UI state
      fetchPaymentData();
    }
  };

  const showPaymentReminder = (customerName: string, amount: number, phone: string) => {
    console.log(`Sending payment verification reminder to ${customerName} with phone ${phone}`);
    
    Alert.alert(
      "Payment Verification Reminder",
      `Send a payment verification reminder to ${customerName} for ₹${amount.toLocaleString()}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Send Reminder", 
          onPress: () => {
            try {
              // In a real app, this would integrate with a messaging service
              console.log(`Sending verification reminder to ${customerName} at ${phone}`);
              
              // Show success message
              Alert.alert(
                "Reminder Sent", 
                `A payment verification reminder has been sent to ${customerName}.`
              );
            } catch (err) {
              console.error("Error sending verification reminder:", err);
              Alert.alert(
                "Error", 
                "Could not send the verification reminder. Please try again."
              );
            }
          }
        }
      ]
    );
  };

  const handleRetry = async () => {
    setRetrying(true);
    setErrorDetails(null);
    
    try {
      // First test the connection
      console.log("Testing database connection before retry...");
      const connected = await debugSupabase();
      
      if (connected) {
        // Connection successful, try to fetch data
        setDbConnected(true);
        setError(null);
        await fetchPaymentData();
      } else {
        // Connection still failing
        setDbConnected(false);
        setError("Database connection failed. Using sample data instead.");
        setErrorDetails("Could not connect to Supabase. Please check your network connection and try again.");
        
        // Use fallback data
        setPaymentsDue([
          { id: '1', name: 'John Doe', phone: 'N/A', amount: 1500, customer_id: '1' },
          { id: '2', name: 'Jane Smith', phone: 'N/A', amount: 2000, customer_id: '2' },
          { id: '3', name: 'Bob Johnson', phone: 'N/A', amount: 1000, customer_id: '3' },
        ]);
        setTotalDue(4500);
        
        setRecentPayments([
          { id: '1', date: 'Jan 22, 2024', name: 'Sarah Wilson', amount: 450, method: 'Cash' },
          { id: '2', date: 'Jan 21, 2024', name: 'Mike Brown', amount: 900, method: 'Credit' },
          { id: '3', date: 'Jan 20, 2024', name: 'Emily Davis', amount: 750, method: 'Cash' },
        ]);
      }
    } catch (err: any) {
      console.error("Error during retry:", err);
      setError("Failed to recover from previous error.");
      setErrorDetails(err?.message || "Unknown error occurred during retry");
    } finally {
      setRetrying(false);
    }
  };

  // Setup a function to retry pending payment verifications
  const retryPendingVerifications = async () => {
    try {
      console.log("Checking for pending payment verifications to retry...");
      
      // Get stored pending operations
      const pendingOpsString = await AsyncStorage.getItem('pendingPaymentVerifications');
      if (!pendingOpsString) {
        console.log("No pending verifications found");
        return;
      }
      
      const pendingOps: PendingVerification[] = JSON.parse(pendingOpsString);
      if (pendingOps.length === 0) {
        console.log("No pending verifications to retry");
        return;
      }
      
      console.log(`Found ${pendingOps.length} pending verifications to retry`);
      
      // Track successful operations to remove from the pending list
      const successfulOps: PendingVerification[] = [];
      const failedOps: PendingVerification[] = [];
      
      // Process each pending operation
      for (const op of pendingOps) {
        try {
          console.log(`Retrying verification for sale ID: ${op.saleId}`);
          
          // Try to update using the RPC function
          const { data, error } = await supabase.rpc(
            'update_sales_payment_status',
            { 
              p_sale_id: op.saleId,
              p_status: 'paid',
              p_verified: true
            }
          );
          
          if (error) {
            console.error("Failed to retry verification:", error);
            failedOps.push(op);
          } else {
            console.log(`Successfully verified sale ID: ${op.saleId}`);
            successfulOps.push(op);
          }
        } catch (err) {
          console.error(`Error retrying verification for ${op.saleId}:`, err);
          failedOps.push(op);
        }
      }
      
      // Update the pending operations list
      if (successfulOps.length > 0) {
        const remainingOps = pendingOps.filter((op: PendingVerification) => 
          !successfulOps.some(sop => sop.saleId === op.saleId)
        );
        
        await AsyncStorage.setItem('pendingPaymentVerifications', JSON.stringify(remainingOps));
        console.log(`Removed ${successfulOps.length} successfully retried verifications`);
        
        // Refresh the UI if any operations succeeded
        if (successfulOps.length > 0) {
          fetchPaymentData();
        }
        
        // Show notification if operations were successfully retried
        if (successfulOps.length > 0) {
          Alert.alert(
            'Sync Complete',
            `Successfully synchronized ${successfulOps.length} pending payment verification(s).`
          );
        }
      }
    } catch (err) {
      console.error("Error retrying pending verifications:", err);
    }
  };
  
  // Call retryPendingVerifications when the database connection is established
  useEffect(() => {
    if (dbConnected === true) {
      retryPendingVerifications();
    }
  }, [dbConnected]);

  // Call retryPendingVerifications when the database connection is established
  useEffect(() => {
    if (dbConnected !== true) return;
    
    // Create an AbortController for this effect
    const abortController = new AbortController();
    
    const safeRetry = async () => {
      if (abortController.signal.aborted) return;
      await retryPendingVerifications();
    };
    
    safeRetry();
    
    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [dbConnected]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPaymentData();
    setRefreshing(false);
  }, []);

  // Only use AnimatedContainer for the main UI
  return (
    <AnimatedContainer style={styles.container}>
      <PageTitleBar title="Payments" showBack={false} />
      
      {/* Payment Summary Cards */}
      <View style={styles.summaryCardsContainer}>
        <View style={[styles.summaryCard, styles.paidCard]}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{paidCount}</Text>
          </View>
          <Text style={styles.summaryNumber}>Verified</Text>
          <Text style={styles.summaryLabel}>Paid</Text>
        </View>
        
        <View style={[styles.summaryCard, styles.dueCard]}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{dueCount}</Text>
          </View>
          <Text style={styles.summaryNumber}>₹{dueAmount.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Due</Text>
        </View>
        
        <View style={[styles.summaryCard, styles.overdueCard]}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{overdueCount}</Text>
          </View>
          <Text style={styles.summaryNumber}>₹{overdueAmount.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
          <Text style={styles.summarySubLabel}>({'>'}48hrs)</Text>
        </View>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B7BB0" />
          <Text style={styles.loadingText}>Loading payment information...</Text>
        </View>
      ) : (
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
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>All Sales - Payment Verification</Text>
              <View style={styles.sectionHeaderSeparator} />
            </View>
            
            <View style={styles.scheduleTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
                <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
                <Text style={[styles.headerCell, styles.amountCell]}>Amount</Text>
                <Text style={[styles.headerCell, styles.actionCell]}>Actions</Text>
              </View>
              
              {paymentsDue.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No pending payments</Text>
                </View>
              ) : (
                paymentsDue.map((payment) => (
                  <View key={payment.id} style={styles.tableRow}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.nameCell]}>{payment.name}</Text>
                    <Text style={[styles.cell, styles.dateCell]}>{payment.sale_date || 'N/A'}</Text>
                    <View style={[styles.cell, styles.amountCell]}>
                      {payment.is_partial ? (
                        <View style={styles.partialPaymentContainer}>
                          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.partialTotalAmount}>₹{payment.original_amount?.toLocaleString()}</Text>
                          <View style={styles.partialPaymentDetail}>
                            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.partialPaymentText}>
                              Paid: <Text style={styles.partialPaidAmount}>₹{payment.paid_amount?.toLocaleString()}</Text>
                            </Text>
                            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.partialPaymentText}>
                              Due: <Text style={styles.partialAmountText}>₹{payment.amount.toLocaleString()}</Text>
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.amountText}>₹{payment.amount.toLocaleString()}</Text>
                      )}
                    </View>
                    <View style={[styles.cell, styles.actionCell]}>
                      <View style={styles.actionButtons}>
                        <Pressable 
                          style={styles.payButton}
                          onPress={() => {
                            setSelectedPayment(payment);
                            setPaymentModalVisible(true);
                          }}
                        >
                          {payment.is_partial ? (
                            <View style={styles.payButtonInner}>
                              <CreditCard size={14} color="#fff" style={styles.actionButtonIcon} />
                              <Text style={styles.payButtonText}>Complete</Text>
                            </View>
                          ) : (
                            <View style={styles.payButtonInner}>
                              <Text style={styles.payButtonText}>Verify</Text>
                            </View>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
              
              {paymentsDue.length > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Due</Text>
                  <Text style={styles.totalAmount}>₹{totalDue.toLocaleString()}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Recent Payments</Text>
              <View style={styles.sectionHeaderSeparator} />
            </View>
            
            <View style={styles.recentTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
                <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
                <Text style={[styles.headerCell, styles.amountCell]}>Amount</Text>
                <Text style={[styles.headerCell, styles.methodCell]}>Method</Text>
                <Text style={[styles.headerCell, styles.statusCell]}>Status</Text>
              </View>
              
              {recentPayments.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No recent payments</Text>
                </View>
              ) : (
                <>
                  {recentPayments.map((payment) => (
                    <View key={payment.id} style={styles.tableRow}>
                      <Text style={[styles.cell, styles.dateCell]}>{payment.date}</Text>
                      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.nameCell]}>{payment.name}</Text>
                      <Text style={[styles.cell, styles.amountCell]}>₹{payment.amount.toLocaleString()}</Text>
                      <View style={[styles.cell, styles.methodCell]}>
                        <View style={[
                          styles.badge, 
                          payment.method.toLowerCase() === 'cash' ? styles.cashBadge : styles.creditBadge
                        ]}>
                          {payment.method.toLowerCase() === 'cash' ? 
                            <Banknote size={12} color="#fff" style={styles.badgeIcon} /> : 
                            <CreditCard size={12} color="#fff" style={styles.badgeIcon} />
                          }
                          <Text style={styles.badgeText}>{payment.method}</Text>
                        </View>
                      </View>
                      <View style={[styles.cell, styles.statusCell]}>
                        <View style={[styles.badge, payment.verified ? styles.verifiedBadge : styles.pendingBadge]}>
                          {payment.verified ? 
                            <Check size={12} color="#fff" style={styles.badgeIcon} /> : 
                            <Clock size={12} color="#fff" style={styles.badgeIcon} />
                          }
                          <Text style={styles.badgeText}>{payment.verified ? 'Verified' : 'Pending'}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  
                  {totalPages > 1 && (
                    <View style={styles.paginationContainer}>
                      <Pressable 
                        style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={20} color={currentPage === 1 ? "#ccc" : "#2B7BB0"} />
                      </Pressable>
                      
                      <Text style={styles.paginationText}>
                        Page {currentPage} of {totalPages}
                      </Text>
                      
                      <Pressable 
                        style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                        onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight size={20} color={currentPage === totalPages ? "#ccc" : "#2B7BB0"} />
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Payment verification modal */}
      {selectedPayment && (
        <PaymentModal
          visible={paymentModalVisible}
          onClose={() => setPaymentModalVisible(false)}
          customerName={selectedPayment.name}
          amountDue={selectedPayment.amount}
          paymentToProcess={selectedPayment}
          onSubmit={(paymentToProcess, amountPaid) => handlePayment(paymentToProcess, amountPaid)}
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
    marginBottom: 20,
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
    color: '#2B7BB0',
    paddingTop: 6,

  },
  sectionTitleContainer: {
    paddingBottom: 2,
    marginBottom: 4,
    paddingLeft: 4,
  },
  sectionHeaderSeparator: {
    height: 1,
    backgroundColor: '#eee',
    marginTop: 8,
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
    paddingVertical: 6,
  },
  tableHeaderBorder: {
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '400',
    color: '#fff',
    paddingHorizontal: 12,
    fontFamily: 'AsapCondensed_400Regular',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  emptyRow: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  cell: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    fontFamily: 'AsapCondensed_400Regular',
    textAlign: 'center',
  },
  nameCell: {
    flex: 1.5,
    textAlign: 'left',
  },
  dateCell: {
    flex: 1.1,
    fontFamily: 'AsapCondensed_400Regular',
    textAlign: 'left',
  },
  amountCell: {
    flex: 1.1,
    alignItems: 'flex-end',
  },
  actionCell: {
    flex: 1.1,
    alignItems: 'center',
  },
  methodCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    justifyContent: 'center',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '400',
    fontFamily: 'AsapCondensed_400Regular',
  },
  cashBadge: {
    backgroundColor: '#FFC371',
  },
  creditBadge: {
    backgroundColor: '#00CDAC',
  },
  upiBadge: {
    backgroundColor: '#95b02b',
  },
  neftBadge: {
    backgroundColor: '#95b02b',
  },
  verifiedBadge: {
    backgroundColor: '#4CAF50',
  },
  pendingBadge: {
    backgroundColor: '#FF9800',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  payButton: {
    backgroundColor: '#33bccf',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  reminderButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2B7BB0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  totalAmount: {
    fontWeight: '600',
    fontSize: 14,
    color: '#2B7BB0',
    fontFamily: 'AsapCondensed_400Regular',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  errorDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
    fontFamily: 'AsapCondensed_400Regular',
  },
  retryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryingButton: {
    backgroundColor: '#999',
  },
  connectionStatusContainer: {
    marginTop: 20,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  connectionStatusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  connectionIndicator: {
    padding: 6,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  connectedIndicator: {
    backgroundColor: '#e8f5e9',
  },
  disconnectedIndicator: {
    backgroundColor: '#ffebee',
  },
  unknownConnectionIndicator: {
    backgroundColor: '#fff9c4',
  },
  connectionIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  partialAmountText: {
    fontWeight: '600',
    color: '#2B7BB0',
    fontFamily: 'AsapCondensed_400Regular',
  },
  partialTotalAmount: {
    fontWeight: '400',
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  partialPaidAmount: {
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'AsapCondensed_400Regular',
  },
  amountText: {
    fontWeight: '400',
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  partialPaymentContainer: {
    alignItems: 'flex-start',
  },
  partialPaymentDetail: {
    marginTop: 2,
    backgroundColor: '#EBF8FF',
    borderRadius: 4,
    padding: 2,
    width: '100%',
  },
  partialPaymentText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#666',
    lineHeight: 18,
    fontFamily: 'AsapCondensed_400Regular',
  },
  actionButtonIcon: {
    marginRight: 6,
  },
  iconBackground: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paginationButton: {
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  summaryCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  paidCard: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  dueCard: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  overdueCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  summarySubLabel: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  countBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
});