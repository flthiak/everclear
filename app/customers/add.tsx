import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AddCustomerParams {
  type: 'customer' | 'distributor' | 'quick';
}

export default function AddCustomerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('Adding customer with data:', {
        name: name.trim(),
        contact_number: phone.trim() || null,
        address: address.trim() || null,
        type: params.type,
        credit_limit: 0,
        current_balance: 0,
      });

      const { data, error: insertError } = await supabase
        .from('customers')
        .insert({
          name: name.trim(),
          contact_number: phone.trim() || null,
          address: address.trim() || null,
          type: params.type || 'customer',
          credit_limit: 0,
          current_balance: 0,
        })
        .select();

      if (insertError) {
        console.error('Database error:', insertError);
        throw insertError;
      }

      console.log('Customer added successfully:', data);
      router.back();
    } catch (err: any) {
      console.error('Error adding customer:', err);
      
      // Provide more specific error message based on the error
      if (err.code === '23505') {
        setError('A customer with this name already exists.');
      } else if (err.code === '23502') {
        setError('Required field is missing. Please fill in all required fields.');
      } else if (err.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError('Failed to add customer. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: `Add New ${params.type === 'distributor' ? 'Distributor' : 'Customer'}`,
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
            onPress={handleAdd}
            disabled={isSubmitting}
          >
            <Text style={styles.saveButtonText}>
              {isSubmitting ? 'Adding...' : 'Add'}
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