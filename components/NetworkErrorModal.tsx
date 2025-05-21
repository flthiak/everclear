import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { WifiOff } from 'lucide-react-native';

interface NetworkErrorModalProps {
  visible: boolean;
  onRetry: () => void;
  onClose: () => void;
  errorMessage?: string;
}

/**
 * A reusable modal component that displays a friendly network error message
 * with options to retry the operation or close the modal.
 */
const NetworkErrorModal: React.FC<NetworkErrorModalProps> = ({
  visible,
  onRetry,
  onClose,
  errorMessage,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <WifiOff size={50} color="#F44336" style={styles.icon} />
          
          <Text style={styles.title}>Connection Error</Text>
          
          <Text style={styles.message}>
            {errorMessage || 'Unable to connect to the server. Please check your internet connection and try again.'}
          </Text>
          
          <View style={styles.buttonContainer}>
            <Pressable 
              style={[styles.button, styles.retryButton]}
              onPress={onRetry}
              android_ripple={{ color: '#1b5e20' }}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
              android_ripple={{ color: '#7f0000' }}
            >
              <Text style={[styles.buttonText, styles.closeButtonText]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    fontFamily: 'AsapCondensed_400Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  closeButtonText: {
    color: '#666',
  },
});

export default NetworkErrorModal; 