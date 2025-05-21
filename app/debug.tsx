import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import { Stack } from 'expo-router';

export default function DebugScreen() {
  const [errorComponents, setErrorComponents] = useState<string[]>([]);

  useEffect(() => {
    // Create a custom error handler to capture React DOM errors
    const originalConsoleError = console.error;
    
    console.error = function(...args) {
      // Check for the text node error
      const errorText = args.join(' ');
      if (errorText.includes('text node') && errorText.includes('child of a <View>')) {
        try {
          // Get stack trace info
          const stackInfo = new Error().stack || '';
          const components = stackInfo
            .split('\n')
            .filter(line => line.includes('components/') || line.includes('app/'))
            .map(line => {
              const match = line.match(/(components\/[\w-]+\.tsx|app\/[\w/-]+\.tsx)/);
              return match ? match[1] : null;
            })
            .filter(Boolean) as string[];
          
          setErrorComponents(prev => [...new Set([...prev, ...components])]);
        } catch (e) {
          // Fallback if parsing fails
          setErrorComponents(prev => [...prev, 'Unknown component']);
        }
      }
      
      // Call the original console.error
      originalConsoleError.apply(console, args);
    };
    
    // Restore original on unmount
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Debug Tools' }} />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.title}>Text Node Inside View Errors</Text>
          
          {errorComponents.length === 0 ? (
            <Text style={styles.emptyText}>No errors detected yet. Try navigating around the app.</Text>
          ) : (
            <>
              <Text style={styles.subtitle}>
                The following components likely contain text nodes directly inside View components:
              </Text>
              
              {errorComponents.map((component, i) => (
                <View key={i} style={styles.errorItem}>
                  <Text style={styles.errorText}>{component}</Text>
                </View>
              ))}
              
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>How to fix:</Text>
                <Text style={styles.infoText}>
                  1. Make sure all text is wrapped in {'<Text>'} components
                </Text>
                <Text style={styles.infoText}>
                  2. Check for dots/periods, spaces, or other text directly inside {'<View>'} tags
                </Text>
                <Text style={styles.infoText}>
                  3. Ensure there are no string interpolations (like {"${var}"}) directly in Views
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  errorItem: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffe082',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#e65100',
  },
  infoBox: {
    marginTop: 20,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    padding: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0d47a1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
}); 