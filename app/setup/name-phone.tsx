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
import { useAuth } from '@/app/context/AuthContext';
import { User, Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BIRD_IMAGE_URL = "https://iili.io/3joKZ6F.md.png";

export default function SetupNamePhoneScreen() {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { requestVerificationPin } = useAuth();

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!name.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter both name and phone number.');
      return;
    }
    if (!/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number (e.g., +1234567890).');
      return;
    }

    setLoading(true);
    try {
      const success = await requestVerificationPin(name.trim(), phoneNumber.trim());
      if (success) {
        router.push({
          pathname: '/setup/verify-pin',
          params: { phone: phoneNumber.trim(), name: name.trim() },
        });
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#D8B5FF', '#1EAE98']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.container}>
          <View style={styles.birdWrapper}>
            <Image
              source={{ uri: BIRD_IMAGE_URL }}
              style={styles.birdImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Register to access the application</Text>

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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Get Verification Code</Text>
              )}
            </Pressable>

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
    backgroundColor: '#D8B5FF', // Fallback background matching gradient start
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
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
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
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
  button: {
    backgroundColor: '#2B7BB0',
    borderRadius: 8,
    paddingVertical: 12,
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