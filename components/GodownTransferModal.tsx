import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  currentStock: number;
}

interface GodownTransferModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (transfer: { [key: string]: number }) => void;
  products: Product[];
}

export default function GodownTransferModal({
  visible,
  onClose,
  onSubmit,
  products,
}: GodownTransferModalProps) {
  const [transfer, setTransfer] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    let hasValues = false;
    let hasError = false;

    // Validate transfer values
    for (const [productId, quantity] of Object.entries(transfer)) {
      if (quantity > 0) {
        const product = products.find(p => p.id === productId);
        if (product && quantity > product.currentStock) {
          setError(`Cannot transfer more than current stock for ${product.name}`);
          hasError = true;
          break;
        }
        hasValues = true;
      }
    }

    if (hasError) return;

    if (!hasValues) {
      setError('Please enter at least one transfer quantity');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(transfer);
      setTransfer({});
    } catch (err) {
      console.error('Error submitting transfer:', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer stock');
    } finally {
      setIsSubmitting(false);
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
            <Text style={styles.title}>Transfer to Godown</Text>
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

            {products.map((product) => (
              <View key={product.id} style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{product.name}</Text>
                  <Text style={styles.stockInfo}>Current: {product.currentStock}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={transfer[product.id]?.toString() || ''}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setTransfer(prev => ({ ...prev, [product.id]: value }));
                    setError(null);
                  }}
                  placeholder="Enter quantity to transfer"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            ))}

            <Pressable
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Transferring...' : 'Transfer to Godown'}
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
    color: '#2B7BB0',
    marginBottom: 8,
    paddingLeft: 12,
    textAlign: 'left',
    fontFamily: 'AsapCondensed_400Regular',
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
  field: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  stockInfo: {
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
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
  submitButton: {
    backgroundColor: '#2B7BB0',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'AsapCondensed_600SemiBold',
  },
});