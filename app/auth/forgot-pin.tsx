import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { Phone, User } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // TODO: Add a function like requestPasswordReset to AuthContext
  // const { requestPasswordReset } = useAuth(); 

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number.');
      return;
    }
    if (!/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number (e.g., +1234567890).');
      return;
    }

    setLoading(true);
    try {
      // Placeholder for actual password reset logic
      console.log(`Requesting password reset for Name: ${name.trim()}, Phone: ${phoneNumber.trim()}`);
      // const success = await requestPasswordReset(name.trim(), phoneNumber.trim()); 
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      const success = true; // Assume success for now

      if (success) {
        Alert.alert(
          'Reset Code Sent',
          'If an account exists for this number, a password reset code has been sent via WhatsApp. Please follow the instructions there.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // TODO: Navigate to a new screen to enter the reset code? Or back to login?
                router.replace('/'); 
              }
            }
          ]
        );
      } else {
         Alert.alert('Error', 'Could not initiate password reset. Please try again.');
      }
    } catch (error: any) {
      console.error("Error in handleSubmit (forgot-password):", error);
      Alert.alert('Error', error?.message || 'Could not request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBackPress = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#56CCF2', '#AA076B']} // Match register screen gradient
        style={styles.background}
      >
        <View style={styles.container}>
          <Image
            source={{ uri: 'https://iili.io/3joKZ6F.md.png' }}
            style={styles.birdImage}
            resizeMode="contain"
          />
          
          <View style={styles.card}>
            <Text style={styles.title}>Forgot Your PIN?</Text>
            <Text style={styles.prompt}>
              Enter your name and phone number below. If an account matches, we'll send a reset code via WhatsApp.
            </Text>

            <View style={styles.inputContainer}>
              <User size={18} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
                textContentType="name"
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Phone size={18} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                editable={!loading}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loadingText}>Sending Reset Instructions...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Send Reset Code</Text>
              )}
            </Pressable>

            <View style={styles.footerLinks}>
               <Pressable onPress={handleGoBackPress} disabled={loading}>
                  <Text style={styles.signInLink}>Back to Sign In</Text>
                </Pressable>
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

// Styles adapted from register.tsx - removed bird image styles and container background
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent', // Ensure SafeAreaView doesn't block gradient
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Changed from 'center' to move content up
    padding: 20,
    paddingTop: 60, // Added padding to push content down from top
    // Removed backgroundColor: '#fff' to show gradient
  },
  card: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#f9eaff', // Match other auth screens
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
    marginLeft: 10,
  },
   title: { // Added title style
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  prompt: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 25,
    fontFamily: 'AsapCondensed_400Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  inputIcon: {
     marginHorizontal: 15, // Adjusted padding
  },
  input: {
    flex: 1,
    paddingVertical: 12, // Slightly increased padding
    paddingRight: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#a7d8ff', // Match other auth screens
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
    minHeight: 50, 
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    backgroundColor: '#cce9ff', // Match other auth screens
  },
  buttonText: {
    color: '#1a5f94', // Match other auth screens
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'AsapCondensed_400Regular',
  },
  footerLinks: {
    marginTop: 25,
    alignItems: 'center',
  },
  signInLink: { // Reused style name for consistency
    color: '#2B7BB0',
    fontWeight: 'bold',
    fontSize: 14, // Match register screen link size
    fontFamily: 'AsapCondensed_400Regular',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#1a5f94', // Match button text color
    fontSize: 14, // Smaller loading text
    fontWeight: 'bold',
    marginLeft: 10,
    fontFamily: 'AsapCondensed_400Regular',
  },
  birdImage: {
    width: 300,
    height: 150,
    marginBottom: -26, 
    alignSelf: 'flex-start',
    marginLeft: 20,
    zIndex: 1,
  },
}); 