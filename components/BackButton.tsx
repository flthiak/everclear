import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function BackButton() {
  const router = useRouter();

  return (
    <Pressable 
      style={styles.button}
      onPress={() => router.back()}
    >
      <ArrowLeft size={24} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginLeft: 8,
  },
});