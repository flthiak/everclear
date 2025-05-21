import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { X } from 'lucide-react-native';
import { useState } from 'react';

interface DamageReportModalProps {
  visible: boolean;
  onClose: () => void;
  material: {
    name: string;
    type: string;
    amount: string;
  };
  onSubmit: (amount: number) => void;
}

export default function DamageReportModal({
  visible,
  onClose,
  material,
  onSubmit,
}: DamageReportModalProps) {
  const [damagedAmount, setDamagedAmount] = useState('');

  const handleSubmit = () => {
    const amount = Number(damagedAmount);
    if (amount > 0) {
      onSubmit(amount);
      setDamagedAmount('');
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
            <Text style={styles.title}>Report Damaged Material</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#666" />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.field}>
              <Text style={styles.label}>Material</Text>
              <View style={styles.valueDisplay}>
                <Text style={styles.valueText}>{material.name} ({material.type})</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Current Amount</Text>
              <View style={styles.valueDisplay}>
                <Text style={styles.valueText}>{material.amount}</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Damaged Amount</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={damagedAmount}
                  onChangeText={setDamagedAmount}
                  keyboardType="numeric"
                  placeholder="Enter damaged quantity"
                  placeholderTextColor="#999"
                />
                <Text style={styles.unitText}>pcs</Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.submitButton,
                (!damagedAmount || Number(damagedAmount) <= 0) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!damagedAmount || Number(damagedAmount) <= 0}
            >
              <Text style={styles.submitButtonText}>Submit Damage Report</Text>
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
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
    color: '#2B7BB0',
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
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  valueDisplay: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  valueText: {
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  unitText: {
    fontSize: 13,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
});