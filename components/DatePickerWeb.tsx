import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Calendar } from 'lucide-react-native';

interface DatePickerWebProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

export default function DatePickerWeb({ value, onChange, label }: DatePickerWebProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <input
          type="date"
          value={value.toISOString().split('T')[0]}
          onChange={(e) => {
            const newDate = new Date(e.target.value);
            onChange(newDate);
          }}
          style={{
            opacity: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
        />
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDate(value)}</Text>
          <Calendar size={18} color="#666" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: 'FiraSans_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'FiraSans_400Regular',
    color: '#333',
  },
});