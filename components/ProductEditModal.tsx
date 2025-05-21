import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  product?: Product | null;
}

export default function ProductEditModal({
  visible,
  onClose,
  onSubmit,
  product,
}: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    product_sn: '',
    product_name: '',
    factory_price: '',
    godown_price: '',
    delivery_price: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        product_sn: product.product_sn,
        product_name: product.product_name,
        factory_price: product.factory_price.toString(),
        godown_price: product.godown_price.toString(),
        delivery_price: product.delivery_price.toString(),
      });
    } else {
      setFormData({
        product_sn: '',
        product_name: '',
        factory_price: '',
        godown_price: '',
        delivery_price: '',
      });
    }
    setError(null);
  }, [product, visible]);

  const validateForm = () => {
    if (!formData.product_sn.trim()) {
      setError('Product SN is required');
      return false;
    }

    if (!formData.product_name.trim()) {
      setError('Product name is required');
      return false;
    }

    const factory_price = Number(formData.factory_price);
    const godown_price = Number(formData.godown_price);
    const delivery_price = Number(formData.delivery_price);

    if (isNaN(factory_price) || isNaN(godown_price) || isNaN(delivery_price)) {
      setError('Please enter valid prices');
      return false;
    }

    if (factory_price < 0 || godown_price < 0 || delivery_price < 0) {
      setError('Prices cannot be negative');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) return;

      setIsSubmitting(true);
      setError(null);

      const newProduct = {
        product_sn: formData.product_sn.trim(),
        product_name: formData.product_name.trim(),
        factory_price: Number(formData.factory_price),
        godown_price: Number(formData.godown_price),
        delivery_price: Number(formData.delivery_price),
      };

      await onSubmit(newProduct);
      
      setFormData({
        product_sn: '',
        product_name: '',
        factory_price: '',
        godown_price: '',
        delivery_price: '',
      });
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err instanceof Error ? err.message : 'Failed to save product');
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
            <Text style={styles.title}>
              {product ? 'Edit Product' : 'Add New Product'}
            </Text>
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

            <View style={styles.field}>
              <Text style={styles.label}>Product SN</Text>
              <TextInput
                style={styles.input}
                value={formData.product_sn}
                onChangeText={(text) => {
                  setFormData({ ...formData, product_sn: text });
                  setError(null);
                }}
                placeholder="Enter product SN"
                placeholderTextColor="#999"
                editable={!isSubmitting && !product} // Only editable for new products
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={styles.input}
                value={formData.product_name}
                onChangeText={(text) => {
                  setFormData({ ...formData, product_name: text });
                  setError(null);
                }}
                placeholder="Enter product name"
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Factory Price (₹)</Text>
              <TextInput
                style={styles.input}
                value={formData.factory_price}
                onChangeText={(text) => {
                  setFormData({ ...formData, factory_price: text });
                  setError(null);
                }}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Godown Price (₹)</Text>
              <TextInput
                style={styles.input}
                value={formData.godown_price}
                onChangeText={(text) => {
                  setFormData({ ...formData, godown_price: text });
                  setError(null);
                }}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Delivery Price (₹)</Text>
              <TextInput
                style={styles.input}
                value={formData.delivery_price}
                onChangeText={(text) => {
                  setFormData({ ...formData, delivery_price: text });
                  setError(null);
                }}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#999"
                editable={!isSubmitting}
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
                style={[
                  styles.button,
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
                </Text>
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
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
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
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
});