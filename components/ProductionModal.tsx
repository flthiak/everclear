import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  currentStock: number;
}

interface ProductionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (production: { [key: string]: number }) => void;
  products: Product[];
}

export default function ProductionModal({
  visible,
  onClose,
  onSubmit,
  products,
}: ProductionModalProps) {
  const [production, setProduction] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    let hasValues = false;

    // Validate production values
    for (const quantity of Object.values(production)) {
      if (quantity > 0) {
        hasValues = true;
        break;
      }
    }

    if (!hasValues) {
      setError('Please enter at least one production quantity');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(production);
      setProduction({});
    } catch (err) {
      console.error('Error submitting production:', err);
      setError('Failed to record production. Please try again.');
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
            <Text style={styles.title}>Record Production</Text>
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
                  value={production[product.id]?.toString() || ''}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setProduction(prev => ({ ...prev, [product.id]: value }));
                    setError(null);
                  }}
                  placeholder="Enter quantity produced"
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
                {isSubmitting ? 'Recording...' : 'Record Production'}
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
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  stockInfo: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
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
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
});