import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Keyboard
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const BIRD_IMAGE_URL = "https://iili.io/3joKZ6F.md.png";

export default function LoginScreen() {
  const [pin, setPin] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter(); // Use router if needed for navigation after login, though layout handles it
  const inputs = useRef<Array<TextInput | null>>([]);

  const handlePinChange = (text: string, index: number) => {
    if (!/^[0-9]?$/.test(text)) return; // Only allow digits

    const newPin = [...pin];
    newPin[index] = text;
    setPin(newPin);

    // Auto-focus next input
    if (text && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    // If last digit entered, attempt login
    if (index === 3 && text) {
      const completePin = newPin.join('');
      Keyboard.dismiss(); // Dismiss keyboard
      handleLogin(completePin);
    }
  };

  const handleBackspace = (key: string, index: number) => {
    if (key === 'Backspace' && !pin[index] && index > 0) {
      // If backspace pressed on empty input, focus previous
      inputs.current[index - 1]?.focus();
      // Also clear the previous input after focusing it
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
    }
  };

  const handleLogin = async (finalPin: string) => {
    if (finalPin.length !== 4) {
      // This shouldn't be reached with the auto-submit, but as fallback
      Alert.alert('Error', 'Please enter a 4-digit PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(finalPin);
      if (!success) {
        // Login function in context handles Alert
        setPin(['', '', '', '']); // Clear PIN on failure
        inputs.current[0]?.focus(); // Focus first input again
      }
      // On success, the RootLayoutNav redirection logic will navigate away
    } catch (error: any) { // Catch unexpected errors
      console.error("Login screen error:", error);
      Alert.alert('Login Error', error.message || 'An unexpected error occurred.');
      setPin(['', '', '', '']); // Clear PIN
      inputs.current[0]?.focus(); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#D8B5FF', '#1EAE98']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.container}>
          {/* Wrapper for bird image to align left */}
          <View style={styles.birdWrapper}>
            <Image
              source={{ uri: BIRD_IMAGE_URL }}
              style={styles.birdImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.card}>
            <Image
              source={{ uri: "https://iili.io/3GuKKgI.md.png" }} // Logo URL
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.prompt}>Enter your PIN to continue</Text>

            <View style={styles.pinContainer}>
              {pin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => inputs.current[index] = ref}
                  style={styles.pinInput}
                  value={digit}
                  onChangeText={(text) => handlePinChange(text, index)}
                  onKeyPress={({ nativeEvent: { key } }) => handleBackspace(key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  secureTextEntry // Hide digits
                  textAlign="center"
                  editable={!isLoading}
                />
              ))}
            </View>

            {isLoading && <ActivityIndicator size="large" color="#2B7BB0" style={styles.loader} />}

            <View style={styles.footerLinks}>
              <Text style={styles.linkText}>
                Don't have a PIN?{" "}
                <Pressable onPress={() => router.push('/setup/name-phone')}>
                  <Text style={styles.registerLink}>Register</Text>
                </Pressable>
              </Text>
              <Text style={styles.linkText}>
                <Pressable onPress={() => router.push('/forgot-password')}>
                  <Text style={styles.registerLink}>Forgot your PIN?</Text>
                </Pressable>
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#D8B5FF', // Fallback background matching gradient start
  },
  background: {
    flex: 1, // Make background cover the whole area
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Change from center to flex-start
    padding: 20,
    paddingTop: 40, // Reduce top padding to move everything up
    backgroundColor: 'transparent',
  },
  card: {
    width: '90%', 
    maxWidth: 400, 
    backgroundColor: 'rgba(255, 255, 255, 0.5)', 
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
    marginTop: -150, // Keep the overlap with bird
  },
  logo: {
    width: '80%',
    height: 80,
    maxWidth: 250,
    marginBottom: 30,
  },
  prompt: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '85%',
    marginBottom: 30,
    alignSelf: 'center',
  },
  pinInput: {
    width: 50,
    height: 55,
    borderBottomWidth: 2,
    borderColor: '#A0A0A0', 
    fontSize: 24,
    color: '#333',
    textAlign: 'center', 
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
    borderRadius: 8, 
  },
  footerLinks: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#444',
    marginBottom: 10,
    fontSize: 14,
  },
  registerLink: {
    color: '#2B7BB0',
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
  },
  birdWrapper: {
    width: '100%',
    alignItems: 'flex-start',
    paddingLeft: 10,
  },
  birdImage: {
    width: 300,
    height: 300,
    marginBottom: 62,
    marginTop: 10,
    zIndex: 9000,
  },
}); 