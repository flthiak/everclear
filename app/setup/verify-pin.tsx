import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const BIRD_IMAGE_URL = "https://iili.io/3joKZ6F.md.png";

export default function SetupVerifyPinScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { phone, name } = useLocalSearchParams<{ phone: string; name: string }>(); 
  const { verifySetupPinAndCreateUser } = useAuth();

  useEffect(() => {
    if (!phone || !name) {
      Alert.alert('Error', 'Missing required information (phone or name).');
      router.replace('/setup/name-phone');
    }
  }, [phone, name, router]);

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      Alert.alert('Error', 'Please enter the 4-digit PIN sent via WhatsApp.');
      return;
    }

    if (!phone || !name) {
        Alert.alert('Error', 'Missing phone number or name for verification.');
        return;
    }

    setLoading(true);
    try {
      const success = await verifySetupPinAndCreateUser(phone, pin, name);

      if (success) {
        Alert.alert(
          'Registration Successful',
          'Your account is created. Please log in with the PIN provided.'
        );
        router.replace('/');
      } else {
        setPin(''); // Clear PIN input on failure
      }
    } catch (error: any) {
      console.error("Error in handleSubmit (verify-pin):", error);
      Alert.alert('Error', error?.message || 'Could not verify PIN.');
      setPin('');
    } finally {
      setLoading(false);
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
          <View style={styles.birdWrapper}>
            <Image
              source={{ uri: BIRD_IMAGE_URL }}
              style={styles.birdImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.card}>
            <Text style={styles.title}>Enter Verification PIN</Text>
            <Text style={styles.subtitle}>
              Hi {name}! We sent a 4-digit PIN to {phone} via WhatsApp. Please enter it below.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="----"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              editable={!loading}
              textAlign="center"
            />

            <Button title={loading ? "Verifying..." : "Verify & Create Account"} onPress={handleSubmit} disabled={loading} />

            {loading && <ActivityIndicator style={styles.loader} size="small" />}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
    padding: 0,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#444',
    padding: 0,
  },
  input: {
    backgroundColor: '#fff',
    width: '80%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 25,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 10,
  },
  loader: {
    marginTop: 20,
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