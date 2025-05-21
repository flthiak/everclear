import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Pressable,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BIRD_IMAGE_URL = "https://iili.io/3joKZ6F.md.png";

export default function ForgotPasswordScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    Keyboard.dismiss();
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
      // Here you would implement the actual password reset logic
      // For now, just show a success message
      Alert.alert(
        'Reset Instructions Sent',
        'Password reset instructions have been sent to your phone.',
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      Alert.alert('Error', error?.message || 'Could not process your request.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
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
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your phone number and we'll send you instructions to reset your password.
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Phone size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </View>
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Instructions</Text>
              )}
            </Pressable>

            <View style={styles.footerLinks}>
              <Text style={styles.linkText}>
                <Pressable onPress={handleGoBack}>
                  <Text style={styles.signInLink}>Back to Sign In</Text>
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
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
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
    marginTop: -150,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 25,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#2B7BB0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonPressed: {
    backgroundColor: '#1c5a80',
  },
  buttonDisabled: {
    backgroundColor: '#a0c8e0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerLinks: {
    marginTop: 25,
    alignItems: 'center',
  },
  linkText: {
    color: '#444',
    fontSize: 14,
  },
  signInLink: {
    color: '#2B7BB0',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 