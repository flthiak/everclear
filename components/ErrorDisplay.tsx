import { View, Text, StyleSheet, Pressable } from 'react-native';
import { TriangleAlert as AlertTriangle } from 'lucide-react-native';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <View style={styles.container}>
      <AlertTriangle size={48} color="#dc3545" />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  message: {
    fontSize: 14,
    fontFamily: 'FiraSans_400Regular',
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'FiraSans_600SemiBold',
  },
});