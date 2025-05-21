import React, { useState, useEffect } from 'react';
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
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { User, Phone, Eye } from 'lucide-react-native';

const BACKGROUND_IMAGE_URL = "https://iili.io/3hJoWJ4.md.jpg";

// Flag to enable debug features in development
const IS_DEV_MODE = true;

export default function SetupNamePhoneScreen() {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastVerificationCode, setLastVerificationCode] = useState('');
  const router = useRouter();
  const { requestVerificationPin } = useAuth();

  // Check for stored verification code
  useEffect(() => {
    if (IS_DEV_MODE && typeof localStorage !== 'undefined') {
      const storedCode = localStorage.getItem('lastVerificationCode');
      if (storedCode) {
        setLastVerificationCode(storedCode);
      }
    }
  }, []);

  const handleSubmit = async () => {
    console.log('[RegisterScreen] handleSubmit started.');
    Keyboard.dismiss();
    if (!name.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter both name and phone number.');
      return;
    }
    
    // Do basic phone validation - allow more lenient format for testing
    if (IS_DEV_MODE) {
      if (phoneNumber.length < 4) {
        Alert.alert('Error', 'Please enter a phone number (any format works in dev mode).');
        return; 
      }
    } else {
      if (!/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im.test(phoneNumber)) {
        Alert.alert('Error', 'Please enter a valid phone number (e.g., +1234567890).');
        return;
      }
    }

    setLoading(true);
    try {
      console.log('[RegisterScreen] Calling requestVerificationPin...');
      const success = await requestVerificationPin(name.trim(), phoneNumber.trim());
      console.log('[RegisterScreen] requestVerificationPin returned:', success);
      
      if (success) {
        // In dev mode, try to retrieve the verification code
        if (IS_DEV_MODE && typeof localStorage !== 'undefined') {
          const storedCode = localStorage.getItem('lastVerificationCode');
          if (storedCode) {
            setLastVerificationCode(storedCode);
          }
        }
        
        Alert.alert(
          'Verification Code Sent',
          'A verification code has been sent to your WhatsApp. Please check your messages and enter the code on the next screen.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                router.push({
                  pathname: '/auth/verify',
                  params: { phone: phoneNumber.trim(), name: name.trim() },
                });
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      Alert.alert('Error', error?.message || 'Could not request verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignInPress = () => {
    router.push('/');
  };
  
  // For dev mode: show/copy verification code
  const showVerificationCode = () => {
    if (IS_DEV_MODE && typeof localStorage !== 'undefined') {
      const storedCode = localStorage.getItem('lastVerificationCode');
      if (storedCode) {
        Alert.alert(
          'Dev Mode: Verification Code',
          `The current verification code is: ${storedCode}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('No Code Available', 'No verification code has been generated yet.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#56CCF2', '#AA076B']}
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
            <Image
              source={{ uri: "https://iili.io/3GuKKgI.md.png" }}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.prompt}>
              Enter your name and phone number to create an account
            </Text>

            <View style={styles.inputContainer}>
              <User size={18} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
                textContentType="name"
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
                  <Text style={styles.loadingText}>Sending WhatsApp verification...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Get Verification Code</Text>
              )}
            </Pressable>

            {/* Dev mode: Show verification code button */}
            {IS_DEV_MODE && (
              <Pressable
                style={({ pressed }) => [
                  styles.devButton,
                  pressed && styles.devButtonPressed,
                ]}
                onPress={showVerificationCode}
              >
                <Eye size={16} color="#555" style={{ marginRight: 5 }} />
                <Text style={styles.devButtonText}>Show Verification Code (DEV)</Text>
              </Pressable>
            )}

            <View style={styles.footerLinks}>
              <Text style={styles.linkText}>
                Already have a PIN?{" "}
                <Pressable onPress={handleSignInPress}>
                  <Text style={styles.signInLink}>Sign In</Text>
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
    backgroundColor: 'transparent',
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 60,
  },
  card: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#f9eaff',
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
    paddingHorizontal: 25,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 15,
    fontSize: 16,
    color: '#333',
    alignContent: 'center',
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
  footerLinks: {
    marginTop: 25,
    alignItems: 'center',
    padding: 0,
    fontFamily: 'AsapCondensed_400Regular',
  },
  linkText: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  signInLink: {
    color: '#2B7BB0',
    fontWeight: 'bold',
    fontFamily: 'AsapCondensed_400Regular',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
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
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'center',
  },
  devButtonPressed: {
    backgroundColor: '#e0e0e0',
  },
  devButtonText: {
    fontSize: 13,
    color: '#555',
  },
}); 