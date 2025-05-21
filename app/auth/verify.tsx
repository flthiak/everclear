import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { RefreshCw } from 'lucide-react-native';

const BACKGROUND_IMAGE_URL = "https://iili.io/3hJoWJ4.md.jpg";
const VERIFICATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export default function SetupVerifyPinScreen() {
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(VERIFICATION_TIMEOUT);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const { phone, name } = useLocalSearchParams<{ phone: string; name: string }>();
  const { verifySetupPinAndCreateUser, requestVerificationPin } = useAuth();
  
  const inputs = useRef<Array<TextInput | null>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format time left
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    if (!phone || !name) {
      Alert.alert('Error', 'Missing required information (phone or name).');
      router.replace('/auth/register');
    }
  }, [phone, name, router]);

  const handlePinChange = (text: string, index: number) => {
    if (!/^[0-9]?$/.test(text)) return; // Only allow digits

    setErrorMessage(null); // Clear error when user types
    
    const newPin = [...pin];
    newPin[index] = text;
    setPin(newPin);

    // Auto-focus next input
    if (text && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    // If last digit entered, attempt verification
    if (index === 3 && text) {
      const completePin = newPin.join('');
      Keyboard.dismiss();
      handleSubmit(completePin);
    }
  };

  const handleBackspace = (key: string, index: number) => {
    if (key === 'Backspace' && !pin[index] && index > 0) {
      // If backspace pressed on empty input, focus previous
      inputs.current[index - 1]?.focus();
      // Also clear the previous input
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
    }
  };

  const handleSubmit = async (pinCode?: string) => {
    const verificationPin = pinCode || pin.join('');
    
    if (verificationPin.length !== 4) {
      setErrorMessage('Please enter the 4-digit PIN sent via WhatsApp.');
      return;
    }

    if (!phone || !name) {
      setErrorMessage('Missing phone number or name for verification.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    
    try {
      const success = await verifySetupPinAndCreateUser(phone, verificationPin, name);

      if (success) {
        Alert.alert(
          'Registration Successful',
          'Your account is created. Please log in with the PIN provided.'
        );
        router.replace('/'); // Redirect to login
      } else {
        setPin(['', '', '', '']); // Clear PIN input on failure
        inputs.current[0]?.focus(); // Focus first input for retry
      }
    } catch (error: any) {
      console.error("Error in handleSubmit (verify-pin):", error);
      setErrorMessage(error?.message || 'Could not verify PIN.');
      setPin(['', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendPin = async () => {
    if (!phone || !name) {
      setErrorMessage('Missing phone number or name for verification.');
      return;
    }

    setResendLoading(true);
    setErrorMessage(null);
    
    try {
      const success = await requestVerificationPin(name, phone);
      
      if (success) {
        // Reset the timer
        setTimeLeft(VERIFICATION_TIMEOUT);
        if (timerRef.current) clearInterval(timerRef.current);
        
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1000) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);
        
        // Clear the PIN inputs
        setPin(['', '', '', '']);
        inputs.current[0]?.focus();
        
        Alert.alert(
          'Verification Code Resent',
          'A new verification code has been sent to your WhatsApp.'
        );
      }
    } catch (error: any) {
      console.error("Error in resend verification:", error);
      setErrorMessage(error?.message || 'Could not resend verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#00BFFF', '#8A2BE2']}
        style={styles.background}
      >
        <View style={styles.container}>
          {/* Bird Image Above Card */}
          <Image
            source={{ uri: 'https://iili.io/3joKZ6F.md.png' }}
            style={styles.birdImage}
            resizeMode="contain"
          />
          
          <View style={styles.card}>
            <Text style={styles.title}>Enter Verification PIN</Text>
            <Text style={styles.subtitle}>
              Hi {name}! We sent a 4-digit PIN to {phone} via WhatsApp. Please enter it below.
            </Text>

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
                  secureTextEntry
                  textAlign="center"
                  editable={!loading && !resendLoading}
                />
              ))}
            </View>

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <Text style={styles.timerText}>
              Code expires in: {formatTimeLeft()}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                (loading || resendLoading) && styles.buttonDisabled,
              ]}
              onPress={() => handleSubmit()}
              disabled={loading || resendLoading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Create Account</Text>
              )}
            </Pressable>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              <Pressable 
                onPress={handleResendPin} 
                disabled={resendLoading || timeLeft === 0 || loading}
                style={({ pressed }) => [
                  styles.resendButton,
                  pressed && styles.resendButtonPressed,
                  (resendLoading || loading) && styles.resendButtonDisabled,
                ]}
              >
                <RefreshCw size={16} color={resendLoading || loading ? "#999" : "#2B7BB0"} />
                <Text style={[
                  styles.resendButtonText,
                  (resendLoading || loading) && styles.resendButtonTextDisabled
                ]}>
                  {resendLoading ? "Sending..." : "Resend Code"}
                </Text>
              </Pressable>
            </View>

            <Pressable 
              onPress={() => router.back()} 
              style={styles.backButton}
              disabled={loading || resendLoading}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  card: {
    width: '90%', 
    maxWidth: 400, 
    backgroundColor: '#f9eaff',
    borderRadius: 20,
    padding: 25, 
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
    padding: 0,
    fontFamily: 'AsapCondensed_400Regular',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#444',
    padding: 0,
    fontFamily: 'AsapCondensed_400Regular',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '90%',
    marginBottom: 20,
    padding: 10,
  },
  pinInput: {
    backgroundColor: '#000',
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
    marginHorizontal: 20,
    fontSize: 24,
    alignContent: 'center',
  },
  errorText: {
    color: '#e53935',
    marginBottom: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: 'AsapCondensed_400Regular',
  },
  timerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontFamily: 'AsapCondensed_400Regular',
  },
  button: {
    backgroundColor: '#a7d8ff',
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
    backgroundColor: '#cce9ff',
  },
  buttonText: {
    color: '#1a5f94',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'AsapCondensed_400Regular',
  },
  resendContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 25,
  },
  resendText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    fontFamily: 'AsapCondensed_400Regular',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  resendButtonPressed: {
    opacity: 0.7,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#2B7BB0',
    marginLeft: 5,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  resendButtonTextDisabled: {
    color: '#999',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  backButtonText: {
    color: '#555',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  loader: {
    marginTop: 20,
  },
  // Add styles for the bird image
  birdImage: {
    width: 300,
    height: 150,
    marginBottom: -26, // Adjusted negative margin
    alignSelf: 'flex-start', // Align to left
    marginLeft: 20, // Add some left margin
    zIndex: 1, // Ensure bird renders on top
  },
}); 