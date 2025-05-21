import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import DatePicker from './DatePicker';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  base_pay: number;
  current_balance: number;
  join_date: string;
}

interface StaffEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (staff: Omit<StaffMember, 'id' | 'current_balance'>) => void;
  staff?: StaffMember | null;
}

export default function StaffEditModal({
  visible,
  onClose,
  onSubmit,
  staff,
}: StaffEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    base_pay: '',
    join_date: new Date(),
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        role: staff.role,
        base_pay: staff.base_pay.toString(),
        join_date: new Date(staff.join_date),
      });
    } else {
      setFormData({
        name: '',
        role: '',
        base_pay: '',
        join_date: new Date(),
      });
    }
    setError(null);
    setIsSubmitting(false);
  }, [staff, visible]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.role.trim()) {
      setError('Role is required');
      return;
    }

    const basePay = Number(formData.base_pay);
    if (isNaN(basePay) || basePay <= 0) {
      setError('Please enter a valid base pay amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: formData.name.trim(),
        role: formData.role.trim(),
        base_pay: basePay,
        join_date: formData.join_date.toISOString(),
      });
    } catch (err) {
      console.error('Error submitting staff:', err);
      setError('Failed to save staff member');
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
              {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </Text>
            <Pressable 
              style={styles.closeButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
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
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  setError(null);
                }}
                placeholder="Enter staff name"
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Role</Text>
              <TextInput
                style={styles.input}
                value={formData.role}
                onChangeText={(text) => {
                  setFormData({ ...formData, role: text });
                  setError(null);
                }}
                placeholder="Enter staff role"
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Base Pay (₹)</Text>
              <TextInput
                style={styles.input}
                value={formData.base_pay}
                onChangeText={(text) => {
                  setFormData({ ...formData, base_pay: text });
                  setError(null);
                }}
                placeholder="Enter base pay amount"
                keyboardType="numeric"
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Join Date</Text>
              <DatePicker
                value={formData.join_date}
                onChange={(date) => {
                  if (date) setFormData({ ...formData, join_date: date });
                }}
              />
            </View>

            <View style={styles.buttons}>
              <Pressable 
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={[
                  styles.cancelButtonText,
                  isSubmitting && styles.disabledButtonText
                ]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.button, 
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Saving...' : staff ? 'Update Staff' : 'Add Staff'}
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
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
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
    padding: 8,
    margin: -8,
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
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
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
  disabledButtonText: {
    opacity: 0.5,
  },
});