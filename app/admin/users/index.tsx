import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface User {
  id: string;
  name: string;
  pin?: string;
  phone?: string;
  role: string;
  permissions: string[];
  lastLogin: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export default function UsersScreen() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'user' | 'role' | 'pin'>('user');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showEditRoleDropdown, setShowEditRoleDropdown] = useState(false);

  // Fetch users from the database
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching users:', error);
        return;
      }
      if (data) {
        setUsers(
          data.map((u: any) => ({
            id: u.id,
            name: u.name,
            pin: u.pin,
            phone: u.phone,
            role: u.is_admin ? 'admin' : 'user',
            permissions: u.is_admin
              ? ['View Sales', 'Create Sales', 'Edit Sales', 'Delete Sales']
              : ['View Sales', 'View Inventory'],
            lastLogin: u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never',
          }))
        );
      }
    } catch (err) {
      console.error('Unexpected error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    console.log('handleAddUser called');
    setLoading(true);
    let fallbackTimeout: number | null = null;
    try {
      // Fallback: show alert if nothing happens after 5 seconds
      fallbackTimeout = setTimeout(() => {
        setLoading(false);
        Alert.alert('Error', 'Something went wrong. Please check your network or database connection.');
      }, 5000);

      // Validate form
      if (!newUserName) {
        setLoading(false);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        Alert.alert('Error', 'Name is required');
        return;
      }
      if (!newUserPhone) {
        setLoading(false);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        Alert.alert('Error', 'Phone number is required');
        return;
      }
      if (!newUserPin) {
        setLoading(false);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        Alert.alert('Error', 'PIN is required');
        return;
      }
      if (!newUserRole) {
        setLoading(false);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        Alert.alert('Error', 'Role is required');
        return;
      }
      console.log('Form validation passed, attempting database insert');
      // Actual database call
      const { data, error } = await supabase.from('users').insert({
        name: newUserName,
        phone: newUserPhone || null,
        pin: newUserPin,
        role: newUserRole,
      }).select();
      if (error) {
        setLoading(false);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        console.error('Database error:', error);
        Alert.alert('Database Error', error.message || 'Failed to add user to database');
        return;
      }
      if (!data || data.length === 0) {
        setLoading(false);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        console.error('No data returned from database');
        Alert.alert('Error', 'Insert failed: No data returned and no error.');
        return;
      }
      // Add new user to the list
      setUsers(prevUsers => [...prevUsers, {
        id: data[0].id,
        name: newUserName,
        phone: newUserPhone,
        pin: newUserPin,
        role: newUserRole,
        lastLogin: 'Never',
        permissions: [],
      }]);
      setNewUserName('');
      setNewUserPhone('');
      setNewUserPin('');
      setNewUserRole('user');
      setShowAddForm(false);
      setLoading(false);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      Alert.alert('Success', 'User added successfully to database');
      // Fetch users again to update the list
      fetchUsers();
    } catch (error: any) {
      setLoading(false);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      console.error('Error in handleAddUser:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  };

  const openEditModal = (user: User) => {
    setEditUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditRole(user.role || '');
    setEditPin(user.pin || '');
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditUser(null);
    setEditName('');
    setEditPhone('');
    setEditRole('');
    setEditPin('');
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      let updateFields: any = {};
      if (activeTab === 'user') {
        updateFields = { name: editName, phone: editPhone };
      } else if (activeTab === 'role') {
        updateFields = { is_admin: editRole === 'admin' };
      } else if (activeTab === 'pin') {
        updateFields = { pin: editPin };
      }
      console.log('Updating user', editUser.id, 'with fields:', updateFields);
      const { error, data } = await supabase.from('users').update(updateFields).eq('id', editUser.id).select();
      console.log('Supabase update response:', { error, data });
      if (error) {
        Alert.alert('Error', error.message || 'Failed to update user');
        setEditLoading(false);
        return;
      }
      Alert.alert('Success', 'User updated successfully');
      closeEditModal();
      await fetchUsers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageTitleBar title="User Management" showBack={false} />
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'user' && styles.activeTab]}
          onPress={() => setActiveTab('user')}
        >
          <Text style={[styles.tabText, activeTab === 'user' && styles.activeTabText]}>User</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'role' && styles.activeTab]}
          onPress={() => setActiveTab('role')}
        >
          <Text style={[styles.tabText, activeTab === 'role' && styles.activeTabText]}>Role</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pin' && styles.activeTab]}
          onPress={() => setActiveTab('pin')}
        >
          <Text style={[styles.tabText, activeTab === 'pin' && styles.activeTabText]}>PIN</Text>
        </TouchableOpacity>
      </View>
      {/* Tab Content */}
      {activeTab === 'user' && (
        <ScrollView style={styles.content}>
          {showAddForm && (
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Add New User</Text>
              {loading && (
                <View style={{ alignItems: 'center', marginBottom: 10 }}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={{ color: '#4CAF50', marginTop: 4 }}>Adding user...</Text>
                </View>
              )}
              <View style={styles.form}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter user name"
                    placeholderTextColor="#999"
                    value={newUserName}
                    onChangeText={setNewUserName}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={newUserPhone}
                    onChangeText={setNewUserPhone}
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.label}>PIN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter PIN"
                    placeholderTextColor="#999"
                    value={newUserPin}
                    onChangeText={setNewUserPin}
                    secureTextEntry
                  />
                </View>
                <View style={[styles.formField, { zIndex: 3000, position: 'relative' }]}>
                  <Text style={styles.label}>Role</Text>
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                    >
                      <Text style={styles.dropdownText}>{newUserRole === 'admin' ? 'Admin' : 'User'}</Text>
                    </TouchableOpacity>
                    {showRoleDropdown && (
                      <View style={styles.dropdownOptions}>
                        <TouchableOpacity
                          style={styles.dropdownOption}
                          onPress={() => { setNewUserRole('admin'); setShowRoleDropdown(false); }}
                        >
                          <Text style={styles.dropdownOptionText}>Admin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dropdownOption}
                          onPress={() => { setNewUserRole('user'); setShowRoleDropdown(false); }}
                        >
                          <Text style={styles.dropdownOptionText}>User</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.formButtons, { zIndex: 1 }]}> 
                  <Pressable
                    style={[styles.formButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddForm(false);
                      setNewUserName('');
                      setNewUserPhone('');
                      setNewUserPin('');
                      setNewUserRole('user');
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.submitButtonContainer}
                    onPress={() => {
                      handleAddUser();
                    }}
                  >
                    <View style={styles.submitButton}>
                      <Text style={styles.submitButtonText}>Add User</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Admin Management</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.addButtonContainer}
                onPress={() => setShowAddForm(true)}
              >
                <View style={styles.addButton}>
                  <Plus size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Add User</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
                <Text style={[styles.headerCell, styles.phoneCell]}>Phone</Text>
                <Text style={[styles.headerCell, styles.loginCell]}>Last Login</Text>
                <Text style={[styles.headerCell, styles.actionsCell]}>Actions</Text>
              </View>
              {users.map((user) => (
                <View key={user.id}>
                  <View style={styles.tableRow}>
                    <Text style={[styles.cell, styles.nameCell]}>{user.name}</Text>
                    <Text style={[styles.cell, styles.phoneCell]}>{user.phone ? user.phone.replace(/^\+91/, '') : '-'}</Text>
                    <Text style={[styles.cell, styles.loginCell]}>{user.lastLogin}</Text>
                    <View style={[styles.cell, styles.actionsCell]}>
                      <View style={styles.actionButtons}>
                        <Pressable style={[styles.actionButton, styles.editButton]} onPress={() => openEditModal(user)}>
                          <Pencil size={16} color="#2B7BB0" />
                        </Pressable>
                        <Pressable style={[styles.actionButton, styles.deleteButton]}>
                          <Trash2 size={16} color="#dc3545" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
          {/* After the Admin Management section, add the dashboard cards */}
          <View style={styles.dashboardContainer}>
            {/* System Status Card */}
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>System Status</Text>
              <View style={styles.statusGrid}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusValue}>24</Text>
                  <Text style={styles.statusLabel}>Active Users</Text>
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusValue}>5</Text>
                  <Text style={styles.statusLabel}>User Roles</Text>
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusValue}>99.9%</Text>
                  <Text style={styles.statusLabel}>Uptime</Text>
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusValue}>v2.1.0</Text>
                  <Text style={styles.statusLabel}>Version</Text>
                </View>
              </View>
            </View>
            {/* Recent Activity Card */}
            <View style={styles.activityCard}>
              <Text style={styles.activityTitle}>Recent Activity</Text>
              <View style={styles.activityList}>
                <View style={styles.activityRow}>
                  <Text style={styles.activityTime}>2 mins ago</Text>
                  <Text style={styles.activityDesc}>User role updated</Text>
                  <Text style={styles.activityBy}>by Admin</Text>
                </View>
                <View style={styles.activityRow}>
                  <Text style={styles.activityTime}>15 mins ago</Text>
                  <Text style={[styles.activityDesc, styles.activityHighlight]}>New user added</Text>
                  <Text style={styles.activityBy}>by Manager</Text>
                </View>
                <View style={styles.activityRow}>
                  <Text style={styles.activityTime}>1 hour ago</Text>
                  <Text style={styles.activityDesc}>Settings changed</Text>
                  <Text style={styles.activityBy}>by Admin</Text>
                </View>
                <View style={styles.activityRow}>
                  <Text style={styles.activityTime}>2 hours ago</Text>
                  <Text style={styles.activityDesc}>Permission modified</Text>
                  <Text style={styles.activityBy}>by Supervisor</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
      {activeTab === 'role' && (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Role Management</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
                <Text style={[styles.headerCell, styles.roleCell]}>Role</Text>
                <Text style={[styles.headerCell, styles.actionsCell]}>Actions</Text>
              </View>
              {users.map((user) => (
                <View key={user.id}>
                  <View style={styles.tableRow}>
                    <Text style={[styles.cell, styles.nameCell]}>{user.name}</Text>
                    <Text style={[styles.cell, styles.roleCell]}>{user.role}</Text>
                    <View style={[styles.cell, styles.actionsCell]}>
                      <View style={styles.actionButtons}>
                        <Pressable style={[styles.actionButton, styles.editButton]} onPress={() => openEditModal(user)}>
                          <Pencil size={16} color="#2B7BB0" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
      {activeTab === 'pin' && (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PIN Management</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
                <Text style={[styles.headerCell, styles.pinCell]}>PIN</Text>
                <Text style={[styles.headerCell, styles.actionsCell]}>Actions</Text>
              </View>
              {users.map((user) => (
                <View key={user.id}>
                  <View style={styles.tableRow}>
                    <Text style={[styles.cell, styles.nameCell]}>{user.name}</Text>
                    <Text style={[styles.cell, styles.pinCell]}>{user.pin || '-'}</Text>
                    <View style={[styles.cell, styles.actionsCell]}>
                      <View style={styles.actionButtons}>
                        <Pressable style={[styles.actionButton, styles.editButton]} onPress={() => openEditModal(user)}>
                          <Pencil size={16} color="#2B7BB0" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit {activeTab === 'user' ? 'User' : activeTab === 'role' ? 'Role' : 'PIN'}</Text>
            {activeTab === 'user' && (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Name"
                />
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone"
                />
              </>
            )}
            {activeTab === 'role' && (
              <>
                <Text style={styles.label}>Role</Text>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowEditRoleDropdown(!showEditRoleDropdown)}
                  >
                    <Text style={styles.dropdownText}>{editRole === 'admin' ? 'Admin' : 'User'}</Text>
                  </TouchableOpacity>
                  {showEditRoleDropdown && (
                    <View style={styles.dropdownOptions}>
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => { setEditRole('admin'); setShowEditRoleDropdown(false); }}
                      >
                        <Text style={styles.dropdownOptionText}>Admin</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => { setEditRole('user'); setShowEditRoleDropdown(false); }}
                      >
                        <Text style={styles.dropdownOptionText}>User</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}
            {activeTab === 'pin' && (
              <>
                <Text style={styles.label}>PIN</Text>
                <TextInput
                  style={styles.input}
                  value={editPin}
                  onChangeText={setEditPin}
                  placeholder="PIN"
                  secureTextEntry
                />
              </>
            )}
            <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
              <Pressable
                style={[styles.formButton, styles.cancelButton]}
                onPress={closeEditModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.formButton, styles.submitButton]}
                onPress={handleEditSave}
                disabled={editLoading}
              >
                <Text style={styles.submitButtonText}>{editLoading ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingBottom: 80,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#2B7BB0',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'visible',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  addButtonContainer: {
    zIndex: 9999,
    elevation: 10,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15, 
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  cell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  nameCell: {
    flex: 2,
  },
  phoneCell: {
    flex: 2,
  },
  loginCell: {
    flex: 1.5,
  },
  actionsCell: {
    flex: 1,
    alignItems: 'center',
  },
  roleTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  adminRole: {
    backgroundColor: '#e3f2fd',
  },
  userRole: {
    backgroundColor: '#f5f5f5',
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
    textTransform: 'uppercase',
  },
  adminRoleText: {
    color: '#2196F3',
  },
  userRoleText: {
    color: '#666',
  },
  permissionsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  editButton: {
    borderColor: '#2B7BB0',
    backgroundColor: '#f0f7ff',
  },
  deleteButton: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 0,
    overflow: 'visible',
  },
  formTitle: {
    fontSize: 18,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    marginBottom: 16,
  },
  form: {
    gap: 16,
    zIndex: 3000,
  },
  formField: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    zIndex: 1,
    position: 'relative',
  },
  formButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 10,
    elevation: 0,
    position: 'relative',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButtonContainer: {
    flex: 1,
    zIndex: 9999,
    elevation: 10,
    position: 'relative',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    borderRadius: 4,
    marginHorizontal: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  roleCell: {
    flex: 1.5,
  },
  pinCell: {
    flex: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  dropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 5000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  dashboardContainer: {
    marginTop: 16,
    marginBottom: 24,
    gap: 18,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusItem: {
    width: '47%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  statusValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2B7BB0',
    fontFamily: 'AsapCondensed_400Regular',
  },
  statusLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    fontFamily: 'AsapCondensed_400Regular',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  activityList: {
    gap: 10,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityTime: {
    fontSize: 13,
    color: '#888',
    width: 80,
    fontFamily: 'AsapCondensed_400Regular',
  },
  activityDesc: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: 'AsapCondensed_400Regular',
  },
  activityHighlight: {
    color: '#2B7BB0',
    fontWeight: 'bold',
  },
  activityBy: {
    fontSize: 13,
    color: '#888',
    width: 80,
    textAlign: 'right',
    fontFamily: 'AsapCondensed_400Regular',
  },
});