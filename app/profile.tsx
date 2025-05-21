import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Alert, TextInput, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Phone, LogOut, ShieldCheck, Edit2, Save, Lock, X } from 'lucide-react-native';
import { useAuth } from '@/app/context/AuthContext';
import PageTitleBar from '@/components/PageTitleBar';
import AppHeader from '@/components/AppHeader';
import BottomNavBar from '@/components/BottomNavBar';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [name, setName] = useState('User');
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      Alert.alert('Logout Failed', 'There was a problem logging out. Please try again.');
    }
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Save changes
      Alert.alert('Profile Updated', 'Your profile has been updated successfully.');
    }
    setEditMode(!editMode);
  };

  const handleChangePin = () => {
    setShowPinModal(true);
  };

  const closeModal = () => {
    setShowPinModal(false);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const submitPinChange = () => {
    // Basic validation
    if (!currentPin) {
      Alert.alert('Error', 'Please enter your current PIN');
      return;
    }
    
    if (!newPin || newPin.length < 4) {
      Alert.alert('Error', 'New PIN must be at least 4 digits');
      return;
    }
    
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'New PINs do not match');
      return;
    }
    
    // Here you would implement the actual PIN change logic
    // For now, we'll just show a success message
    Alert.alert('Success', 'Your PIN has been changed successfully');
    closeModal();
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return '';
    // Format as needed, e.g., +XX-XXXX-XXXX
    return phoneNumber.replace(/(\d{2})(\d{4})(\d{4})/, '+$1-$2-$3');
  };

  const openImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const openEditModal = () => {
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
  };

  return (
    <View style={styles.container}>
      <AppHeader showBack={true} />
      <PageTitleBar title="My Profile" showBack={true} />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <User size={40} color="#FFF" />
            )}
            <Pressable style={styles.editIcon} onPress={openEditModal}>
              <Edit2 size={16} color="#FFF" />
            </Pressable>
          </View>
          {editMode ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your Name"
            />
          ) : (
            <Text style={styles.userName}>{name}</Text>
          )}
          <Text style={styles.userRole}>
            {user?.roleId ? 'Staff Member' : 'User'}
          </Text>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <Pressable onPress={toggleEditMode} style={styles.editButton}>
              {editMode ? (
                <>
                  <Save size={16} color="#2B7BB0" />
                  <Text style={styles.editButtonText}>Save</Text>
                </>
              ) : (
                <>
                  <Edit2 size={16} color="#2B7BB0" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Phone size={20} color="#2B7BB0" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>
                {user?.phone_number ? formatPhoneNumber(user.phone_number) : 'Not available'}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <ShieldCheck size={20} color="#2B7BB0" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>
                {user?.roleId ? 'Staff Member' : 'User'}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#d1d1d1', true: '#a7d8ff' }}
              thumbColor={notificationsEnabled ? '#2B7BB0' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#d1d1d1', true: '#a7d8ff' }}
              thumbColor={darkModeEnabled ? '#2B7BB0' : '#f4f3f4'}
            />
          </View>

          <Pressable style={styles.securityButton} onPress={handleChangePin}>
            <Lock size={18} color="#2B7BB0" />
            <Text style={styles.securityButtonText}>Change PIN</Text>
          </Pressable>
        </View>

        {/* Logout Button */}
        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#FFF" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>

        {/* Add bottom padding for nav bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change PIN</Text>
              <Pressable onPress={closeModal} style={styles.closeButton}>
                <X size={20} color="#333" />
              </Pressable>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Current PIN</Text>
              <TextInput
                style={styles.pinInput}
                value={currentPin}
                onChangeText={setCurrentPin}
                placeholder="Enter current PIN"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
              
              <Text style={styles.inputLabel}>New PIN</Text>
              <TextInput
                style={styles.pinInput}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter new PIN"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
              
              <Text style={styles.inputLabel}>Confirm New PIN</Text>
              <TextInput
                style={styles.pinInput}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Confirm new PIN"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
              
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={submitPinChange}>
                  <Text style={styles.confirmButtonText}>Change PIN</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={closeEditModal} style={styles.closeButton}>
                <X size={20} color="#333" />
              </Pressable>
            </View>
            <View style={styles.modalContent}>
              <Pressable style={styles.imagePickerButton} onPress={openImagePicker}>
                <Text style={styles.imagePickerButtonText}>Change Profile Picture</Text>
              </Pressable>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Your Name"
              />
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelButton} onPress={closeEditModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={toggleEditMode}>
                  <Text style={styles.confirmButtonText}>Save Changes</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Bottom Nav Bar */}
      <BottomNavBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fcfe',
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2B7BB0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#2B7BB0',
    borderRadius: 12,
    padding: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2B7BB0',
    paddingBottom: 4,
    textAlign: 'center',
    minWidth: 150,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#2B7BB0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    gap: 8,
  },
  securityButtonText: {
    fontSize: 16,
    color: '#2B7BB0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 14,
    marginVertical: 20,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#ff8672',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    letterSpacing: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2B7BB0',
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  imagePickerButton: {
    padding: 12,
    backgroundColor: '#2B7BB0',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePickerButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  bottomSpacer: {
    height: 70,
  },
});