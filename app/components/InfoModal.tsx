import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { AlertCircle, X, WifiOff, Database, Server, Info } from 'lucide-react-native';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  isOffline?: boolean;
  envInfo?: {
    supabaseUrl?: string;
    supabaseKeyPartial?: string;
  };
  onRetry?: () => void;
}

export default function InfoModal({
  visible,
  onClose,
  title,
  message,
  isOffline = false,
  envInfo,
  onRetry
}: InfoModalProps) {
  
  // Truncate and mask the Supabase key for display
  const maskSupabaseKey = (key?: string) => {
    if (!key) return 'Not available';
    if (key.length < 10) return '***';
    return key.substring(0, 6) + '...' + key.substring(key.length - 4);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            {isOffline ? (
              <WifiOff size={24} color="#d32f2f" />
            ) : (
              <AlertCircle size={24} color="#d32f2f" />
            )}
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#666" />
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalMessage}>{message}</Text>
            
            {envInfo && (
              <View style={styles.envInfoContainer}>
                <View style={styles.envInfoHeader}>
                  <Database size={16} color="#666" />
                  <Text style={styles.envInfoTitle}>Database Configuration</Text>
                </View>
                
                <View style={styles.envInfoRow}>
                  <Text style={styles.envInfoLabel}>Supabase URL:</Text>
                  <Text style={styles.envInfoValue}>{envInfo.supabaseUrl || 'Not set'}</Text>
                </View>
                
                <View style={styles.envInfoRow}>
                  <Text style={styles.envInfoLabel}>API Key:</Text>
                  <Text style={styles.envInfoValue}>{maskSupabaseKey(envInfo.supabaseKeyPartial)}</Text>
                </View>
                
                <View style={styles.infoBox}>
                  <Info size={16} color="#2196F3" />
                  <Text style={styles.infoText}>
                    Make sure your database credentials are properly configured in your .env file
                    and that the Supabase service is running.
                  </Text>
                </View>
              </View>
            )}
            
            {isOffline && (
              <View style={styles.troubleshootingContainer}>
                <Text style={styles.troubleshootingTitle}>Troubleshooting Steps:</Text>
                <View style={styles.troubleshootingItem}>
                  <Server size={16} color="#666" />
                  <Text style={styles.troubleshootingText}>
                    1. Check your internet connection
                  </Text>
                </View>
                <View style={styles.troubleshootingItem}>
                  <Server size={16} color="#666" />
                  <Text style={styles.troubleshootingText}>
                    2. Verify that your Supabase project is active
                  </Text>
                </View>
                <View style={styles.troubleshootingItem}>
                  <Server size={16} color="#666" />
                  <Text style={styles.troubleshootingText}>
                    3. Ensure your API keys are correctly set in .env
                  </Text>
                </View>
                <View style={styles.troubleshootingItem}>
                  <Server size={16} color="#666" />
                  <Text style={styles.troubleshootingText}>
                    4. Restart the application
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            {onRetry && (
              <Pressable style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryButtonText}>Retry Connection</Text>
              </Pressable>
            )}
            <Pressable style={styles.closeModalButton} onPress={onClose}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalMessage: {
    fontSize: 16,
    color: '#444',
    marginBottom: 16,
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  retryButton: {
    backgroundColor: '#2B7BB0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  closeModalButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  closeModalButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  envInfoContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  envInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  envInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  envInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  envInfoLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  envInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 12,
    color: '#444',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  troubleshootingContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  troubleshootingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  troubleshootingText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
    flex: 1,
  },
}); 