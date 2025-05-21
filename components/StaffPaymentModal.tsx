import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import { useState } from 'react';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  staffName: string;
  currentBalance: number;
  onSubmit: (amount: number, purpose: string) => void;
}

export default function PaymentModal({
  visible,
  onClose,
  staffName,
  currentBalance,
  onSubmit,
}: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (paymentAmount > currentBalance) {
      setError('Payment amount cannot exceed current balance');
      return;
    }

    if (!purpose.trim()) {
      setError('Please enter a purpose for the payment');
      return;
    }

    onSubmit(paymentAmount, purpose.trim());
    setAmount('');
    setPurpose('');
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
            <Text style={styles.title}>Make Payment</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#666" />
            </Pressable>
          </View>

          <View style={styles.content}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{staffName}</Text>
              <Text style={styles.balanceText}>
                Current Balance: <Text style={styles.balanceAmount}>₹{currentBalance.toLocaleString()}</Text>
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter payment amount"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Purpose</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={purpose}
                onChangeText={setPurpose}
                placeholder="Enter payment purpose"
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.buttons}>
              <Pressable 
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Make Payment</Text>
              </Pressable>
            </View>
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
    fontSize: 18,
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  staffInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  staffName: {
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  balanceAmount: {
    color: '#2B7BB0',
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: '600',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: '600',
  },
});