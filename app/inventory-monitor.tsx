import BottomNavBar from '@/components/BottomNavBar';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import InventoryMonitor from './components/InventoryMonitor';
import InventoryTrend from './components/InventoryTrend';

export default function InventoryMonitorPage() {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Inventory Monitor',
          headerShown: false,
        }}
      />
      
      {/* Header with the same style as sales.tsx */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Monitor</Text>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={24} color="#3498db" />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <InventoryTrend />
        <View style={styles.monitorContainer}>
          <InventoryMonitor />
        </View>
      </ScrollView>
      
      {/* Bottom Navigation Bar */}
      <BottomNavBar activeTab="stock" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    marginLeft: 4,
    color: '#3498db',
  },
  scrollView: {
    flex: 1,
    marginBottom: 80, // Add space for the bottom navigation bar
  },
  monitorContainer: {
    flex: 1,
    paddingBottom: 20,
  },
}); 