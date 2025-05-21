import DatePicker from '@/components/DatePicker';
import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import { ChevronDown, Package, Plus, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface Supplier {
  id: string;
  name: string;
  contact?: string;
}

interface SupplierExpense {
  id: string;
  supplier_id: string;
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  invoice_amount: number;
  payment_amount: number;
  payment_date: string | null;
  description: string;
  status: 'pending' | 'partial' | 'paid';
}

export default function SuppliesExpenseScreen() {
  // State for supplier management
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [showAddSupplierForm, setShowAddSupplierForm] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  
  // State for invoice/expense entry
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [invoiceAmount, setInvoiceAmount] = useState('');
  
  // State for expense list
  const [expenses, setExpenses] = useState<SupplierExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<SupplierExpense | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [makingPayment, setMakingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  
  // Add state for payment history modal
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [selectedPaidExpense, setSelectedPaidExpense] = useState<SupplierExpense | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Load suppliers on mount
  useEffect(() => {
    fetchSuppliers();
    fetchExpenses();
  }, []);
  
  // Fetch suppliers from database
  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      if (data) {
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };
  
  // Fetch expenses from database
  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const { data, error } = await supabase
        .from('supplier_expenses')
        .select(`
          id,
          supplier_id,
          invoice_number,
          invoice_date,
          invoice_amount,
          payment_amount,
          payment_date,
          description,
          status,
          suppliers(name)
        `)
        .order('invoice_date', { ascending: false })
        .limit(15);
        
      if (error) throw error;
      
      if (data) {
        // Format the data
        const formattedExpenses = data.map(expense => ({
          id: expense.id,
          supplier_id: expense.supplier_id,
          supplier_name: expense.suppliers ? (expense.suppliers as any).name : 'Unknown Supplier',
          invoice_number: expense.invoice_number,
          invoice_date: new Date(expense.invoice_date).toLocaleDateString(),
          invoice_amount: expense.invoice_amount,
          payment_amount: expense.payment_amount || 0,
          payment_date: expense.payment_date ? new Date(expense.payment_date).toLocaleDateString() : null,
          description: expense.description,
          status: expense.status
        }));
        
        setExpenses(formattedExpenses);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoadingExpenses(false);
    }
  };
  
  // Add a new supplier
  const addSupplier = async () => {
    if (!newSupplierName.trim()) {
      setError('Supplier name is required');
      return;
    }
    
    setAddingSupplier(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: newSupplierName.trim(),
          contact: newSupplierContact.trim() || null
        })
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSuppliers([...suppliers, data[0]]);
        setSelectedSupplier(data[0]);
        setShowAddSupplierForm(false);
        setNewSupplierName('');
        setNewSupplierContact('');
        setShowSupplierModal(false);
      }
    } catch (err) {
      console.error('Error adding supplier:', err);
      setError('Failed to add supplier. Please try again.');
    } finally {
      setAddingSupplier(false);
    }
  };
  
  // Submit expense form
  const submitExpense = async () => {
    if (!selectedSupplier || !invoiceNumber || !invoiceAmount) {
      setError('Please fill all required fields');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const numInvoiceAmount = parseFloat(invoiceAmount);
      
      if (isNaN(numInvoiceAmount)) {
        setError('Please enter a valid amount');
        setSubmitting(false);
        return;
      }
      
      // Insert the new expense record
      const { data, error } = await supabase
        .from('supplier_expenses')
        .insert({
          supplier_id: selectedSupplier.id,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate.toISOString(),
          invoice_amount: numInvoiceAmount,
          payment_amount: 0,
          payment_date: null,
          description: '',
          status: 'pending'
        })
        .select();
        
      if (error) {
        console.error('Insertion error:', error);
        throw error;
      }
      
      // Clear form and refresh expenses
      resetForm();
      fetchExpenses();
      
    } catch (err) {
      console.error('Error submitting expense:', err);
      setError('Failed to submit expense. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Reset form fields
  const resetForm = () => {
    setSelectedSupplier(null);
    setInvoiceNumber('');
    setInvoiceDate(new Date());
    setInvoiceAmount('');
  };
  
  // Filter suppliers based on search query
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Add payment to an expense
  const addPayment = async () => {
    if (!selectedExpense || !paymentAmount) {
      setError('Please enter a payment amount');
      return;
    }
    
    const numPaymentAmount = parseFloat(paymentAmount);
    if (isNaN(numPaymentAmount) || numPaymentAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }
    
    const due = selectedExpense.invoice_amount - selectedExpense.payment_amount;
    if (numPaymentAmount > due) {
      setError(`Payment cannot exceed the due amount (₹${due.toFixed(2)})`);
      return;
    }
    
    setMakingPayment(true);
    setError(null);
    
    try {
      const newPaymentTotal = selectedExpense.payment_amount + numPaymentAmount;
      const newStatus = newPaymentTotal >= selectedExpense.invoice_amount ? 'paid' : 'partial';
      const paymentDate = new Date().toISOString();
      
      // First, add entry to payment_history table
      const { error: historyError } = await supabase
        .from('payment_history')
        .insert({
          expense_id: selectedExpense.id,
          amount: numPaymentAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          notes: paymentNote || `Payment of ₹${numPaymentAmount.toFixed(2)}`
        });
        
      if (historyError) throw historyError;
      
      // Then update the supplier_expenses record
      const { error: updateError } = await supabase
        .from('supplier_expenses')
        .update({
          payment_amount: newPaymentTotal,
          payment_date: paymentDate,
          status: newStatus
        })
        .eq('id', selectedExpense.id);
        
      if (updateError) throw updateError;
      
      // Refresh expenses and close modal
      fetchExpenses();
      setShowPaymentModal(false);
      setSelectedExpense(null);
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setPaymentNote('');
      
    } catch (err) {
      console.error('Error making payment:', err);
      setError('Failed to record payment. Please try again.');
    } finally {
      setMakingPayment(false);
    }
  };
  
  // Filter expenses by payment status
  const pendingExpenses = expenses.filter(expense => 
    expense.invoice_amount > expense.payment_amount
  );
  
  const paidExpenses = expenses.filter(expense => 
    expense.invoice_amount <= expense.payment_amount
  );
  
  // Fetch payment history for an expense
  const fetchPaymentHistory = async (expenseId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('expense_id', expenseId)
        .order('payment_date', { ascending: false });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Format the dates for display
        const formattedHistory = data.map(payment => ({
          ...payment,
          payment_date: new Date(payment.payment_date).toLocaleDateString(),
          formatted_amount: payment.amount.toFixed(2)
        }));
        setPaymentHistory(formattedHistory);
      } else {
        // If no payment history found in the dedicated table,
        // create a single entry from the expense record for backward compatibility
        const expense = paidExpenses.find(e => e.id === expenseId);
        if (expense && expense.payment_amount > 0) {
          const fallbackHistory = [
            {
              id: 'legacy-payment',
              expense_id: expenseId,
              amount: expense.payment_amount,
              formatted_amount: expense.payment_amount.toFixed(2),
              payment_date: expense.payment_date || 'Unknown date',
              payment_method: 'Cash',
              notes: 'Full payment (legacy record)'
            }
          ];
          setPaymentHistory(fallbackHistory);
        } else {
          setPaymentHistory([]);
        }
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setPaymentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <PageTitleBar
        title="Supplier Expenses"
        showBack={false}
      />
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.centeredTitle]}>Supplier Expenses</Text>
        
        {loadingExpenses ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2B7BB0" />
            <Text style={styles.loadingText}>Loading expenses...</Text>
          </View>
        ) : pendingExpenses.length === 0 ? (
          <Text style={styles.emptyText}>No unpaid supplier expenses found</Text>
        ) : (
          <View style={styles.expenseList}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, { flex: 3 }]}>Supplier</Text>
              <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'right' }]}>Invoice</Text>
              <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'right' }]}>Paid</Text>
              <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'right' }]}>Due</Text>
              <View style={[styles.headerCell, { flex: 1, alignItems: 'center' }]}>
                <Text>Action</Text>
              </View>
            </View>
            
            {pendingExpenses.map(expense => (
              <View key={expense.id} style={styles.expenseItem}>
                <Text style={[styles.cell, { flex: 3 }]} numberOfLines={1}>{expense.supplier_name}</Text>
                <Text style={[styles.cell, { flex: 1.2, textAlign: 'right' }]}>₹{expense.invoice_amount.toFixed(2)}</Text>
                <Text style={[styles.cell, { flex: 1.2, textAlign: 'right' }]}>₹{expense.payment_amount.toFixed(2)}</Text>
                <Text style={[styles.cell, { flex: 1.2, textAlign: 'right', color: '#f44336', fontWeight: '500' }]}>
                  ₹{(expense.invoice_amount - expense.payment_amount).toFixed(2)}
                </Text>
                <View style={[styles.actionCell, { flex: 1 }]}>
                  <Pressable 
                    style={styles.payButton}
                    onPress={() => {
                      setSelectedExpense(expense);
                      setShowPaymentModal(true);
                    }}
                  >
                    <Text style={styles.payButtonText}>₹ Pay</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Supplier Expense</Text>
        <View style={styles.card}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <View style={styles.form}>
            {/* Supplier Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Supplier *</Text>
              <Pressable 
                style={styles.supplierSelector}
                onPress={() => setShowSupplierModal(true)}
              >
                <Text style={[
                  styles.selectorText,
                  !selectedSupplier && styles.placeholderText
                ]}>
                  {selectedSupplier ? selectedSupplier.name : 'Select Supplier'}
                </Text>
                <ChevronDown size={16} color="#666" />
              </Pressable>
            </View>
            
            {/* Invoice Details */}
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Invoice # *</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceNumber}
                  onChangeText={setInvoiceNumber}
                  placeholder="Invoice Number"
                  placeholderTextColor="#aaa"
                />
              </View>
              
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.label}>Invoice Date *</Text>
                <DatePicker
                  value={invoiceDate}
                  onChange={(date: Date | null) => {
                    if (date) setInvoiceDate(date);
                  }}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Invoice Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={invoiceAmount}
                onChangeText={setInvoiceAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />
            </View>
            
            <View style={styles.buttonContainer}>
              <Pressable
                style={[
                  styles.button, 
                  styles.primaryButton,
                  (submitting || !selectedSupplier || !invoiceNumber || !invoiceAmount) && styles.disabledButton
                ]}
                onPress={submitExpense}
                disabled={submitting || !selectedSupplier || !invoiceNumber || !invoiceAmount}
              >
                <Text style={styles.buttonText}>
                  {submitting ? 'Submitting...' : 'Add Expense'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      
      {paidExpenses.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.centeredTitle]}>Older Supplies</Text>
          <View style={styles.expenseList}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, { flex: 2.5 }]}>Supplier</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>Invoice #</Text>
              <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.headerCell, { flex: 1.3 }]}>Paid Date</Text>
              <View style={[styles.headerCell, { flex: 0.8, alignItems: 'center' }]}>
                <Text>Status</Text>
              </View>
            </View>
            
            {paidExpenses.map(expense => (
              <View key={expense.id} style={styles.expenseItem}>
                <Text style={[styles.cell, { flex: 2.5 }]} numberOfLines={1}>{expense.supplier_name}</Text>
                <Text style={[styles.cell, { flex: 1 }]}>{expense.invoice_number}</Text>
                <Text style={[styles.cell, { flex: 1.2, textAlign: 'right' }]}>₹{expense.invoice_amount.toFixed(2)}</Text>
                <Text style={[styles.cell, { flex: 1.3 }]}>{expense.payment_date || 'Unknown'}</Text>
                <View style={[styles.actionCell, { flex: 0.8 }]}>
                  <Pressable 
                    style={[styles.paidBadge, { width: '100%' }]}
                    onPress={() => {
                      setSelectedPaidExpense(expense);
                      fetchPaymentHistory(expense.id);
                      setShowPaymentHistoryModal(true);
                    }}
                  >
                    <Text style={styles.viewHistoryText}>View</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* Supplier Selection Modal */}
      <Modal
        visible={showSupplierModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSupplierModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Supplier</Text>
              <Pressable onPress={() => setShowSupplierModal(false)}>
                <X size={24} color="#333" />
              </Pressable>
            </View>
            
            <View style={styles.searchContainer}>
              <Search size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search suppliers..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>
            
            {!showAddSupplierForm ? (
              <>
                <FlatList
                  data={filteredSuppliers}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <Pressable 
                      style={styles.supplierItem}
                      onPress={() => {
                        setSelectedSupplier(item);
                        setShowSupplierModal(false);
                      }}
                    >
                      <View style={styles.supplierIconContainer}>
                        <Package size={16} color="#2B7BB0" />
                      </View>
                      <View style={styles.supplierInfo}>
                        <Text style={styles.supplierName}>{item.name}</Text>
                        {item.contact && (
                          <Text style={styles.supplierContact}>{item.contact}</Text>
                        )}
                      </View>
                    </Pressable>
                  )}
                  style={styles.supplierList}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      No suppliers found. Add a new supplier.
                    </Text>
                  }
                />
                
                <Pressable 
                  style={styles.addSupplierButton}
                  onPress={() => setShowAddSupplierForm(true)}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.addSupplierButtonText}>Add New Supplier</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.addSupplierForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Supplier Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={newSupplierName}
                    onChangeText={setNewSupplierName}
                    placeholder="Enter supplier name"
                    placeholderTextColor="#aaa"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Contact Information (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={newSupplierContact}
                    onChangeText={setNewSupplierContact}
                    placeholder="Phone or email"
                    placeholderTextColor="#aaa"
                  />
                </View>
                
                <View style={styles.buttonRow}>
                  <Pressable 
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setShowAddSupplierForm(false);
                      setNewSupplierName('');
                      setNewSupplierContact('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={[
                      styles.button, 
                      styles.primaryButton,
                      (!newSupplierName.trim() || addingSupplier) && styles.disabledButton
                    ]}
                    onPress={addSupplier}
                    disabled={!newSupplierName.trim() || addingSupplier}
                  >
                    <Text style={styles.buttonText}>
                      {addingSupplier ? 'Adding...' : 'Save Supplier'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Make Payment</Text>
              <Pressable onPress={() => {
                setShowPaymentModal(false);
                setSelectedExpense(null);
                setPaymentAmount('');
                setPaymentMethod('Cash');
                setPaymentNote('');
                setError(null);
              }}>
                <X size={24} color="#333" />
              </Pressable>
            </View>
            
            {selectedExpense && (
              <View style={styles.paymentForm}>
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
                
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDetailLabel}>Supplier:</Text>
                  <Text style={styles.paymentDetailValue}>{selectedExpense.supplier_name}</Text>
                </View>
                
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDetailLabel}>Invoice:</Text>
                  <Text style={styles.paymentDetailValue}>{selectedExpense.invoice_number}</Text>
                </View>
                
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDetailLabel}>Total Amount:</Text>
                  <Text style={styles.paymentDetailValue}>₹{selectedExpense.invoice_amount.toFixed(2)}</Text>
                </View>
                
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDetailLabel}>Already Paid:</Text>
                  <Text style={styles.paymentDetailValue}>₹{selectedExpense.payment_amount.toFixed(2)}</Text>
                </View>
                
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDetailLabel}>Due Amount:</Text>
                  <Text style={[styles.paymentDetailValue, styles.dueAmount]}>
                    ₹{(selectedExpense.invoice_amount - selectedExpense.payment_amount).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Payment Method</Text>
                  <View style={styles.paymentMethodContainer}>
                    {['Cash', 'Bank Transfer', 'UPI', 'Check'].map(method => (
                      <Pressable
                        key={method}
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === method && styles.selectedPaymentMethod
                        ]}
                        onPress={() => setPaymentMethod(method)}
                      >
                        <Text style={[
                          styles.paymentMethodText,
                          paymentMethod === method && styles.selectedPaymentMethodText
                        ]}>
                          {method}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={paymentNote}
                    onChangeText={setPaymentNote}
                    placeholder="Add payment details or reference"
                    multiline
                    numberOfLines={2}
                    placeholderTextColor="#aaa"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Payment Amount (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor="#aaa"
                  />
                </View>
                
                <Pressable 
                  style={[
                    styles.button, 
                    styles.primaryButton,
                    (!paymentAmount || makingPayment) && styles.disabledButton
                  ]}
                  onPress={addPayment}
                  disabled={!paymentAmount || makingPayment}
                >
                  <Text style={styles.buttonText}>
                    {makingPayment ? 'Processing...' : 'Make Payment'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Payment History Modal */}
      <Modal
        visible={showPaymentHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment History</Text>
              <Pressable onPress={() => {
                setShowPaymentHistoryModal(false);
                setSelectedPaidExpense(null);
              }}>
                <X size={24} color="#333" />
              </Pressable>
            </View>
            
            {selectedPaidExpense && (
              <View style={styles.paymentHistoryContainer}>
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDetailLabel}>Supplier:</Text>
                  <Text style={styles.paymentDetailValue}>{selectedPaidExpense.supplier_name}</Text>
                </View>
                
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDetailLabel}>Invoice:</Text>
                  <Text style={styles.paymentDetailValue}>{selectedPaidExpense.invoice_number}</Text>
                </View>
                
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDetailLabel}>Total Amount:</Text>
                  <Text style={styles.paymentDetailValue}>₹{selectedPaidExpense.invoice_amount.toFixed(2)}</Text>
                </View>
                
                <Text style={styles.historyLabel}>Payment Transactions:</Text>
                
                {loadingHistory ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#2B7BB0" />
                    <Text style={styles.loadingText}>Loading payment history...</Text>
                  </View>
                ) : paymentHistory.length === 0 ? (
                  <Text style={styles.emptyText}>No payment records found</Text>
                ) : (
                  <View style={styles.historyTable}>
                    <View style={styles.historyTableHeader}>
                      <Text style={[styles.historyHeaderCell, { flex: 1.2 }]}>Date</Text>
                      <Text style={[styles.historyHeaderCell, { flex: 1, textAlign: 'right' }]}>Amount</Text>
                      <Text style={[styles.historyHeaderCell, { flex: 1.2 }]}>Method</Text>
                      <Text style={[styles.historyHeaderCell, { flex: 1.6 }]}>Notes</Text>
                    </View>
                    
                    {paymentHistory.map((payment, index) => (
                      <View key={payment.id || index} style={styles.historyTableRow}>
                        <Text style={[styles.historyCell, { flex: 1.2 }]}>{payment.payment_date}</Text>
                        <Text style={[styles.historyCell, { flex: 1, textAlign: 'right' }]}>₹{payment.formatted_amount}</Text>
                        <Text style={[styles.historyCell, { flex: 1.2 }]}>{payment.payment_method || 'Not specified'}</Text>
                        <Text style={[styles.historyCell, { flex: 1.6 }]} numberOfLines={2}>
                          {payment.notes || '-'}
                        </Text>
                      </View>
                    ))}
                    
                    <View style={styles.historyTableFooter}>
                      <Text style={[styles.historyFooterCell, { flex: 1.2 }]}>Total Paid:</Text>
                      <Text style={[styles.historyFooterCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                        ₹{paymentHistory.reduce((sum, payment) => sum + parseFloat(payment.formatted_amount), 0).toFixed(2)}
                      </Text>
                      <Text style={[styles.historyFooterCell, { flex: 2.8 }]}></Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingBottom: 60,
  },
  contentContainer: {
    paddingBottom: 80, // Space for bottom navigation bar
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '98%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  centeredTitle: {
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  form: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
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
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  halfWidth: {
    width: '48%',
  },
  buttonContainer: {
    marginTop: 16,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#2B7BB0',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
    marginRight: 10,
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  supplierSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectorText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  placeholderText: {
    color: '#aaa',
    fontFamily: 'AsapCondensed_400Regular',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  supplierList: {
    flexGrow: 1,
    marginBottom: 16,
  },
  supplierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  supplierIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  supplierContact: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'AsapCondensed_400Regular',
  },
  addSupplierButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSupplierButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  addSupplierForm: {
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  expenseList: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    paddingRight: 8,
    alignItems: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cell: {
    fontSize: 14,
    color: '#333',
    paddingRight: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    flex: 0.8,
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: '#ffecb3',
  },
  partialBadge: {
    backgroundColor: '#e1f5fe',
  },
  paidBadge: {
    backgroundColor: '#e8f5e9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  payButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: 'AsapCondensed_400Regular',
  },
  actionCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentForm: {
    padding: 8,
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  paymentDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  dueAmount: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  viewHistoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0a7d2e',
    fontFamily: 'AsapCondensed_400Regular',
  },
  paymentHistoryContainer: {
    padding: 8,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginVertical: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  historyTable: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  historyTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyHeaderCell: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    fontFamily: 'AsapCondensed_400Regular',
  },
  historyTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  historyCell: {
    fontSize: 13,
    color: '#333',
    paddingRight: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  historyTableFooter: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
  },
  historyFooterCell: {
    fontSize: 13,
    color: '#333',
    paddingRight: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  paymentMethodOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedPaymentMethod: {
    backgroundColor: '#4CAF50',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#333',
  },
  selectedPaymentMethodText: {
    color: '#fff',
    fontWeight: '500',
  },
}); 