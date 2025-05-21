import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { X, AlertCircle, ChevronDown } from 'lucide-react-native';
import { useState, useEffect } from 'react';

interface PaymentDue {
  id: string;
  name: string;
  phone: string;
  amount: number;
  customer_id: string;
  sale_date?: string;
  payment_method?: string;
  delivery?: boolean;
  is_partial?: boolean;
  paid_amount?: number;
  original_amount?: number;
}

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  customerName: string;
  amountDue: number;
  paymentToProcess: PaymentDue;
  onSubmit: (payment: PaymentDue, amountPaid: number) => void;
}

const PAYMENT_METHODS = ['Cash', 'Credit', 'UPI', 'NEFT', 'GPay', 'PhonePe', 'Paytm'];

export default function PaymentModal({
  visible,
  onClose,
  customerName,
  amountDue,
  paymentToProcess,
  onSubmit,
}: PaymentModalProps) {
  const [amount, setAmount] = useState(amountDue.toString());
  const [payFullAmount, setPayFullAmount] = useState(true);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);
  
  // Check if this is a continued partial payment
  const isPartialPayment = paymentToProcess.is_partial;
  const previouslyPaid = paymentToProcess.paid_amount || 0;
  const originalAmount = paymentToProcess.original_amount || amountDue;
  
  // Determine if payment method is already set and should be non-editable
  const paymentMethodPreset = !!paymentToProcess.payment_method;

  // Reset the form when the modal becomes visible
  useEffect(() => {
    if (visible) {
      setAmount(amountDue.toString());
      setPayFullAmount(true);
      setRemainingAmount(0);
      
      // Set the payment method to the preset value or default to Cash
      if (paymentToProcess.payment_method) {
        setPaymentMethod(paymentToProcess.payment_method);
        console.log("Using preset payment method:", paymentToProcess.payment_method);
      } else {
        setPaymentMethod('Cash');
        console.log("Using default payment method: Cash");
      }
    }
  }, [visible, amountDue, paymentToProcess.payment_method]);

  // Calculate remaining amount whenever the amount changes
  useEffect(() => {
    const parsedAmount = Number(amount);
    const remaining = !isNaN(parsedAmount) ? amountDue - parsedAmount : 0;
    setRemainingAmount(remaining > 0 ? remaining : 0);
  }, [amount, amountDue]);

  const handleAmountChange = (value: string) => {
    // Filter non-numeric chars except decimal point
    const filteredValue = value.replace(/[^\d.]/g, '');
    
    // Ensure no more than one decimal point
    const parts = filteredValue.split('.');
    const formattedValue = parts.length > 1 
      ? `${parts[0]}.${parts.slice(1).join('')}`
      : filteredValue;
    
    setAmount(formattedValue);
    
    // Automatically uncheck "pay full amount" if amount is changed
    if (formattedValue !== amountDue.toString()) {
      setPayFullAmount(false);
    }
  };

  const handleSubmit = () => {
    try {
      // Get the payment amount (either full or partial)
      const paymentAmount = payFullAmount ? amountDue : Number(amount);
      
      // Validate amount
      if (isNaN(paymentAmount) || paymentAmount <= 0 || paymentAmount > amountDue) {
        console.log("Invalid payment amount:", amount);
        return;
      }
      
      console.log("Processing payment of", paymentAmount, "for", customerName);
      console.log("Payment method selected:", paymentMethod);
      
      // Close modal first
      onClose();
      
      // Submit payment asynchronously with amount paid and updated payment method
      setTimeout(() => {
        // Make sure payment_method is explicitly set
        const updatedPayment = {
          ...paymentToProcess,
          payment_method: paymentMethod
        };
        
        // Log the payment details being sent
        console.log("Submitting payment with method:", updatedPayment.payment_method);
        console.log("Full payment object:", JSON.stringify(updatedPayment));
        
        onSubmit(updatedPayment, paymentAmount);
      }, 100);
      
      // Reset form
      setAmount('');
      setPayFullAmount(true);
    } catch (err) {
      console.error("Error in payment submission:", err);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isPartialPayment ? 'Complete Payment' : 'Verify Payment'} for {customerName}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#666" />
            </Pressable>
          </View>

          <View style={styles.content}>
            {isPartialPayment && (
              <View style={styles.partialPaymentInfo}>
                <Text style={styles.partialLabel}>Previous Payment:</Text>
                <Text style={styles.partialAmount}>₹{previouslyPaid.toLocaleString()}</Text>
                <Text style={styles.partialLabel}>Original Amount:</Text>
                <Text style={styles.partialAmount}>₹{originalAmount.toLocaleString()}</Text>
              </View>
            )}
          
            {/* Amount Due and Payment Method in the same row */}
            <View style={styles.rowContainer}>
              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.label}>
                  {isPartialPayment ? 'Remaining Amount Due' : 'Amount Due'}
                </Text>
                <View style={styles.amountDisplay}>
                  <Text style={styles.amountText}>₹{amountDue.toLocaleString()}</Text>
                </View>
              </View>

              <View style={[styles.field, styles.fieldHalf]}>
                <Text style={styles.label}>Payment Method</Text>
                {paymentMethodPreset ? (
                  <View style={styles.paymentBadgeContainer}>
                    <View style={[
                      styles.paymentBadge,
                      paymentToProcess.payment_method?.toLowerCase() === 'cash' && styles.cashBadge,
                      paymentToProcess.payment_method?.toLowerCase() === 'credit' && styles.creditBadge,
                      paymentToProcess.payment_method?.toLowerCase() === 'upi' && styles.upiBadge,
                      paymentToProcess.payment_method?.toLowerCase() === 'neft' && styles.neftBadge,
                      paymentToProcess.payment_method?.toLowerCase() === 'gpay' && styles.gpayBadge,
                      paymentToProcess.payment_method?.toLowerCase() === 'phonepe' && styles.phonePeBadge,
                      paymentToProcess.payment_method?.toLowerCase() === 'paytm' && styles.paytmBadge
                    ]}>
                      <Text style={styles.paymentBadgeText}>
                        {paymentToProcess.payment_method}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View>
                    <Pressable 
                      style={styles.paymentMethodSelector}
                      onPress={() => setShowPaymentMethodDropdown(!showPaymentMethodDropdown)}
                    >
                      <Text style={styles.paymentMethodText}>{paymentMethod}</Text>
                      <ChevronDown size={16} color="#666" />
                    </Pressable>
                    
                    {showPaymentMethodDropdown && (
                      <View style={styles.dropdown}>
                        {PAYMENT_METHODS.map((method) => (
                          <Pressable 
                            key={method}
                            style={[
                              styles.dropdownItem,
                              method === paymentMethod && styles.selectedDropdownItem
                            ]}
                            onPress={() => {
                              setPaymentMethod(method);
                              setShowPaymentMethodDropdown(false);
                            }}
                          >
                            <Text 
                              style={[
                                styles.dropdownItemText,
                                method === paymentMethod && styles.selectedDropdownItemText
                              ]}
                            >
                              {method}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.checkboxContainer}>
              <Pressable
                style={[styles.checkbox, payFullAmount && styles.checkboxChecked]}
                onPress={() => {
                  const newValue = !payFullAmount;
                  setPayFullAmount(newValue);
                  setAmount(newValue ? amountDue.toString() : '');
                }}
              >
                {payFullAmount && <View style={styles.checkboxInner} />}
              </Pressable>
              <Text style={styles.checkboxLabel}>Verify full amount</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Amount Paid</Text>
              <TextInput
                style={[
                  styles.input, 
                  payFullAmount && styles.inputDisabled
                ]}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="Enter amount"
                keyboardType="numeric"
                placeholderTextColor="#999"
                editable={!payFullAmount}
              />
            </View>

            {!payFullAmount && amount && Number(amount) > 0 && (
              <View style={styles.remainingContainer}>
                <View style={styles.remainingRow}>
                  <Text style={styles.remainingLabel}>Remaining Balance:</Text>
                  <Text style={styles.remainingAmount}>₹{remainingAmount.toLocaleString()}</Text>
                </View>
                
                <View style={styles.infoBox}>
                  <AlertCircle size={16} color="#2B7BB0" style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    Partial payments will be recorded. The remaining balance will stay in the payment schedule.
                  </Text>
                </View>
              </View>
            )}

            <Pressable
              style={[
                styles.submitButton,
                (!amount || Number(amount) <= 0 || Number(amount) > amountDue) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!amount || Number(amount) <= 0 || Number(amount) > amountDue}
            >
              <Text style={styles.submitButtonText}>
                {payFullAmount ? 'Verify Full Payment' : 'Record Partial Payment'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  amountDisplay: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 6,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2B7BB0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2B7BB0',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 6,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f8f9fa',
    color: '#999',
  },
  remainingContainer: {
    marginBottom: 16,
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  remainingLabel: {
    fontSize: 14,
    color: '#333',
  },
  remainingAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e53935',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#2B7BB0',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  paymentMethodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  paymentMethodDisplay: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#333',
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedDropdownItem: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDropdownItemText: {
    fontWeight: '600',
    color: '#2B7BB0',
  },
  partialPaymentInfo: {
    marginBottom: 16,
  },
  partialLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  partialAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentBadgeContainer: {
    flexDirection: 'row',
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  cashBadge: {
    backgroundColor: '#217535',
  },
  creditBadge: {
    backgroundColor: '#2B7BB0',
  },
  upiBadge: {
    backgroundColor: '#2bb05a',
  },
  neftBadge: {
    backgroundColor: '#95b02b',
  },
  gpayBadge: {
    backgroundColor: '#4285F4',
  },
  phonePeBadge: {
    backgroundColor: '#5f259f',
  },
  paytmBadge: {
    backgroundColor: '#00BAF2',
  },
  paymentBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fieldHalf: {
    width: '48%',
    marginBottom: 0,
  },
});