import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  nullable?: boolean;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, label, nullable = false, placeholder = 'Select date' }: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return placeholder;
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const handleClear = () => {
    if (nullable) {
      onChange(null);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={styles.inputContainer}>
          <input
            type="date"
            value={value ? value.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              if (e.target.value) {
                const newDate = new Date(e.target.value);
                onChange(newDate);
              } else if (nullable) {
                onChange(null);
              }
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
            <Text style={[styles.dateText, !value && styles.placeholderText]}>
              {formatDate(value)}
            </Text>
            <View style={styles.iconContainer}>
              {nullable && value && (
                <Pressable onPress={handleClear} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>×</Text>
                </Pressable>
              )}
              <Calendar size={18} color="#666" />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        style={styles.dateDisplay}
        onPress={() => {
          // If no date is set, initialize with today
          if (!value) {
            onChange(new Date());
          }
          setShowPicker(true);
        }}
      >
        <Text style={[styles.dateText, !value && styles.placeholderText]}>
          {formatDate(value)}
        </Text>
        <View style={styles.iconContainer}>
          {nullable && value && (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>×</Text>
            </Pressable>
          )}
          <Calendar size={18} color="#666" />
        </View>
      </Pressable>

      {showPicker && value && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) {
              onChange(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 14,
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
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#aaa',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginRight: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
    lineHeight: 18,
    textAlign: 'center',
  },
});