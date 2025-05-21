import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFonts, Geologica_400Regular } from '@expo-google-fonts/geologica';

interface TableHeaderProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export default function TableHeader({ children, variant = 'primary' }: TableHeaderProps) {
  const [fontsLoaded] = useFonts({
    Geologica_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[
      styles.tableHeader, 
      variant === 'primary' ? styles.primaryHeader : styles.secondaryHeader
    ]}>
      <Text style={styles.headerText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  primaryHeader: {
    backgroundColor: '#f0f0f0',
  },
  secondaryHeader: {
    backgroundColor: '#e3f2fd',
  },
  headerText: {
    fontFamily: 'Geologica_400Regular',
    fontSize: 16,
    color: '#1e293b',
  },
}); 