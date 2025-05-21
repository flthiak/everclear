import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';
import { Phone, User, AlertTriangle, Lock } from 'lucide-react-native';

enum AuthStep {
  REQUEST_CODE = 'REQUEST_CODE',
  ENTER_CODE = 'ENTER_CODE',
}

export default function WhatsAppAuthScreen() {
  const { requestVerificationPin, verifySetupPinAndCreateUser, isLoading } = useAuth();
  
  const [step, setStep] = useState<AuthStep>(AuthStep.REQUEST_CODE);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');

  const validateRequestForm = (): boolean => {
    let isValid = true;
    
    if (!name.trim()) {
      setNameError('Please enter your name');
      isValid = false;
    } else {
      setNameError('');
    }
    
    if (!phoneNumber.trim()) {
      setPhoneError('Please enter your phone number');
      isValid = false;
    } else if (!isValidPhoneNumber(phoneNumber)) {
      setPhoneError('Please enter a valid phone number (10 digits)');
      isValid = false;
    } else {
      setPhoneError('');
    }
    
    return isValid;
  };
  
  const isValidPhoneNumber = (phone: string): boolean => {
    // Simple validation - check if it has 10 digits after removing non-digits
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
  };
  
  const handleRequestCode = async () => {
    if (!validateRequestForm()) return;
    
    try {
      const success = await requestVerificationPin(name, phoneNumber);
      if (success) {
        setStep(AuthStep.ENTER_CODE);
        Alert.alert(
          'Verification Code Sent',
          'Please check your WhatsApp for a verification code and enter it below.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to request verification code:', error);
    }
  };
  
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setCodeError('Please enter the verification code');
      return;
    }
    
    setCodeError('');
    
    try {
      const success = await verifySetupPinAndCreateUser(phoneNumber, verificationCode, name);
      if (success) {
        // Redirect to the main app after successful verification and account creation
        router.replace('/');
      }
    } catch (error) {
      console.error('Failed to verify code:', error);
    }
  };
  
  const goBack = () => {
    if (step === AuthStep.ENTER_CODE) {
      setStep(AuthStep.REQUEST_CODE);
    } else {
      router.back();
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Set Up WhatsApp Authentication</Text>
        <Text style={styles.subtitle}>
          {step === AuthStep.REQUEST_CODE 
            ? 'Enter your details to receive a verification code via WhatsApp'
            : 'Enter the verification code sent to your WhatsApp'
          }
        </Text>
      </View>
      
      {step === AuthStep.REQUEST_CODE ? (
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <User size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>
          {nameError ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={16} color="#d32f2f" />
              <Text style={styles.errorText}>{nameError}</Text>
            </View>
          ) : null}
          
          <View style={styles.inputContainer}>
            <Phone size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="WhatsApp Number (e.g. 9876543210)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>
          {phoneError ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={16} color="#d32f2f" />
              <Text style={styles.errorText}>{phoneError}</Text>
            </View>
          ) : null}
          
          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleRequestCode}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Lock size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Verification Code"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              editable={!isLoading}
              maxLength={6}
              autoFocus
            />
          </View>
          {codeError ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={16} color="#d32f2f" />
              <Text style={styles.errorText}>{codeError}</Text>
            </View>
          ) : null}
          
          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleVerifyCode}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Create Account</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity style={styles.backButton} onPress={goBack} disabled={isLoading}>
        <Text style={styles.backButtonText}>
          {step === AuthStep.ENTER_CODE ? 'Change Phone Number' : 'Back to Login'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2B7BB0',
    marginBottom: 10,
    fontFamily: 'AsapCondensed_400Regular',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 15,
    paddingLeft: 5,
  },
  errorText: {
    color: '#d32f2f',
    marginLeft: 5,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  button: {
    backgroundColor: '#2B7BB0',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#2B7BB0',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
}); 