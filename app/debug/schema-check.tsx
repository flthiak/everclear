import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SchemaCheck() {
  const [schema, setSchema] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkTableSchema() {
      try {
        setLoading(true);
        
        // This query will get column information from the PostgreSQL system tables
        const { data, error } = await supabase.rpc('get_table_info', {
          table_name: 'payments'
        });
        
        if (error) {
          throw new Error(`Error fetching schema: ${error.message}`);
        }
        
        console.log('Schema data:', data);
        setSchema(data || []);
      } catch (err: any) {
        console.error('Schema check error:', err);
        setError(err.message || 'An error occurred while checking schema');
        
        // Fallback: try to retrieve data from the table to infer schema
        try {
          const { data: paymentData } = await supabase
            .from('payments')
            .select('*')
            .limit(1);
            
          if (paymentData && paymentData.length > 0) {
            // Create schema info from the returned row's structure
            const inferredSchema = Object.keys(paymentData[0]).map(key => ({
              column_name: key,
              data_type: typeof paymentData[0][key],
              is_nullable: 'UNKNOWN',
              inferred: true
            }));
            
            setSchema(inferredSchema);
            setError(`${err.message} (Using inferred schema from data)`);
          }
        } catch (fallbackErr) {
          // If even the fallback fails, just show the original error
          console.error('Fallback schema check failed:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    }
    
    checkTableSchema();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Schema Checker' }} />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.title}>Payments Table Schema</Text>
          
          {loading ? (
            <Text style={styles.loadingText}>Loading schema information...</Text>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : schema.length === 0 ? (
            <Text style={styles.emptyText}>No schema information found.</Text>
          ) : (
            <>
              <Text style={styles.subtitle}>Table contains {schema.length} columns:</Text>
              
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameCell]}>Column</Text>
                <Text style={[styles.headerCell, styles.typeCell]}>Type</Text>
                <Text style={[styles.headerCell, styles.nullableCell]}>Nullable</Text>
              </View>
              
              {schema.map((column, index) => (
                <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}>
                  <Text style={[styles.cell, styles.nameCell]}>{column.column_name}</Text>
                  <Text style={[styles.cell, styles.typeCell]}>
                    {column.inferred ? `(inferred: ${column.data_type})` : column.data_type}
                  </Text>
                  <Text style={[styles.cell, styles.nullableCell]}>
                    {column.is_nullable === 'YES' ? 'Yes' : 
                     column.is_nullable === 'NO' ? 'No' : column.is_nullable}
                  </Text>
                </View>
              ))}
              
              <View style={styles.note}>
                <Text style={styles.noteText}>
                  Note: Make sure your database columns match the types expected by your application code.
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.button}
                onPress={() => {
                  setLoading(true);
                  // Create function to check table
                  supabase.rpc('create_schema_check_function')
                    .then(() => {
                      // Now try to check the schema again
                      return supabase.rpc('get_table_info', { table_name: 'payments' });
                    })
                    .then(({ data }) => {
                      setSchema(data || []);
                      setError(null);
                    })
                    .catch(err => {
                      setError(`Failed to create helper function: ${err.message}`);
                    })
                    .finally(() => {
                      setLoading(false);
                    });
                }}
              >
                <Text style={styles.buttonText}>Create Schema Helper & Retry</Text>
              </TouchableOpacity>
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
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 4,
    padding: 12,
    marginVertical: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerCell: {
    padding: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alternateRow: {
    backgroundColor: '#fafafa',
  },
  cell: {
    padding: 10,
    color: '#333',
  },
  nameCell: {
    flex: 2,
  },
  typeCell: {
    flex: 2,
  },
  nullableCell: {
    flex: 1,
    textAlign: 'center',
  },
  note: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },
  noteText: {
    fontSize: 12,
    color: '#0d47a1',
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 