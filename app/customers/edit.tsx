import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface EditCustomerParams {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: 'customer' | 'distributor' | 'quick';
}

export default function EditCustomerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const [name, setName] = useState(params.name || '');
  const [phone, setPhone] = useState(params.phone || '');
  const [address, setAddress] = useState(params.address || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('Updating customer with data:', {
        id: params.id,
        name: name.trim(),
        contact_number: phone.trim() || null,
        address: address.trim() || null,
      });

      const { data, error: updateError } = await supabase
        .from('customers')
        .update({
          name: name.trim(),
          contact_number: phone.trim() || null,
          address: address.trim() || null,
        })
        .eq('id', params.id)
        .select();

      if (updateError) {
        console.error('Database error:', updateError);
        throw updateError;
      }

      console.log('Customer updated successfully:', data);
      router.back();
    } catch (err: any) {
      console.error('Error updating customer:', err);
      
      // Provide more specific error message based on the error
      if (err.code === '23505') {
        setError('A customer with this name already exists.');
      } else if (err.code === '23502') {
        setError('Required field is missing. Please fill in all required fields.');
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError('Failed to update customer. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: `Edit ${params.type === 'distributor' ? 'Distributor' : 'Customer'}`,
          headerStyle: { backgroundColor: '#2B7BB0' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'AsapCondensed_400Regular' },
        }}
      />

      <View style={styles.form}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="numeric"
            maxLength={10}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.buttons}>
          <Pressable 
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable 
            style={[styles.button, styles.saveButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={isSubmitting}
          >
            <Text style={styles.saveButtonText}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  form: {
    padding: 16,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 13,
    fontFamily: 'AsapCondensed_400Regular',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontFamily: 'AsapCondensed_400Regular',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'AsapCondensed_400Regular',
  },
});