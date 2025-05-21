import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import PageTitleBar from '@/components/PageTitleBar';
import StaffEditModal from '@/components/StaffEditModal';
import PaymentModal from '@/components/StaffPaymentModal';
import { supabase } from '@/lib/supabase';
import { ChevronDown, IndianRupee, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  base_pay: number;
  current_balance: number;
  join_date: string;
}

interface Payment {
  id: string;
  staff_id: string;
  amount: number;
  purpose: string;
  payment_date: string;
  staff?: { name: string };
}

export default function StaffScreen() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingBasePay, setIsAddingBasePay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentFilterDropdown, setShowPaymentFilterDropdown] = useState(false);
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string | null>(null);
  const [showBasePayCard, setShowBasePayCard] = useState(false);

  useEffect(() => {
    fetchStaffData();
    fetchRecentPayments();
    checkBasePayStatus();
  }, []);

  const fetchStaffData = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name');

      if (error) throw error;
      setStaffList(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Failed to load staff data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_payments')
        .select(`
          id,
          staff_id,
          amount,
          purpose,
          payment_date,
          staff:staff_id(name)
        `)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentPayments(data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const checkBasePayStatus = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Check if today is the 12th of the month
    const isTwelfthDay = currentDay === 12;
    
    // Check if base pay has already been processed for this month
    const hasProcessedBasePayThisMonth = recentPayments.some(payment => {
      const paymentDate = new Date(payment.payment_date);
      return (
        payment.purpose === 'Monthly Base Pay' &&
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear
      );
    });
    
    // Show the card only on the 12th and if base pay hasn't been processed yet
    setShowBasePayCard(isTwelfthDay && !hasProcessedBasePayThisMonth);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setShowEditModal(true);
  };

  const handleAddStaff = () => {
    setSelectedStaff(null);
    setShowEditModal(true);
  };

  const handleDeleteStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setShowDeleteModal(true);
  };

  const handleMakePayment = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setShowPaymentModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', selectedStaff.id);

      if (error) throw error;
      
      setStaffList(prev => prev.filter(s => s.id !== selectedStaff.id));
      setShowDeleteModal(false);
      setSelectedStaff(null);
    } catch (err) {
      console.error('Error deleting staff:', err);
      setError('Failed to delete staff member');
    }
  };

  const handleSubmitStaff = async (staff: Omit<StaffMember, 'id' | 'current_balance'>) => {
    try {
      if (selectedStaff) {
        // Update existing staff
        const { error } = await supabase
          .from('staff')
          .update(staff)
          .eq('id', selectedStaff.id);

        if (error) throw error;
        
        setStaffList(prev => prev.map(s => 
          s.id === selectedStaff.id ? { ...s, ...staff } : s
        ));
      } else {
        // Add new staff
        const { data, error } = await supabase
          .from('staff')
          .insert({ ...staff, current_balance: staff.base_pay })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setStaffList(prev => [...prev, data]);
        }
      }

      setShowEditModal(false);
      setSelectedStaff(null);
    } catch (err) {
      console.error('Error saving staff:', err);
      setError('Failed to save staff member');
    }
  };

  const handlePaymentSubmit = async (amount: number, purpose: string) => {
    if (!selectedStaff) return;

    try {
      // Record payment
      const { error: paymentError } = await supabase
        .from('staff_payments')
        .insert({
          staff_id: selectedStaff.id,
          amount,
          purpose,
          payment_date: new Date().toISOString(),
        });

      if (paymentError) throw paymentError;

      // Update staff balance - add for base pay, subtract for other payments
      const newBalance = purpose === 'Monthly Base Pay' 
        ? selectedStaff.current_balance + amount
        : selectedStaff.current_balance - amount;

      const { error: updateError } = await supabase
        .from('staff')
        .update({
          current_balance: newBalance,
        })
        .eq('id', selectedStaff.id);

      if (updateError) throw updateError;

      // Refresh data
      await Promise.all([
        fetchStaffData(),
        fetchRecentPayments(),
      ]);

      setShowPaymentModal(false);
      setSelectedStaff(null);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Failed to process payment');
    }
  };

  const handleAddBasePayToAll = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Update each staff member's balance by adding their base pay
      for (const staff of staffList) {
        const newBalance = staff.current_balance + staff.base_pay;
        
        const { error: updateError } = await supabase
          .from('staff')
          .update({
            current_balance: newBalance,
          })
          .eq('id', staff.id);
          
        if (updateError) throw updateError;
        
        // Record the payment
        const { error: paymentError } = await supabase
          .from('staff_payments')
          .insert({
            staff_id: staff.id,
            amount: staff.base_pay,
            purpose: 'Monthly Base Pay',
            payment_date: new Date().toISOString(),
          });
          
        if (paymentError) throw paymentError;
      }
      
      // Refresh data
      await Promise.all([
        fetchStaffData(),
        fetchRecentPayments(),
      ]);
      
      // Turn off the switch after successful processing
      setIsAddingBasePay(false);
    } catch (err) {
      console.error('Error adding base pay to all staff:', err);
      setError('Failed to add base pay to staff members');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalBasePay = staffList.reduce((sum, staff) => sum + staff.base_pay, 0);
  const totalBalance = staffList.reduce((sum, staff) => sum + staff.current_balance, 0);

  const getFilteredPayments = () => {
    if (!selectedPaymentFilter) {
      return recentPayments;
    }
    return recentPayments.filter(payment => 
      payment.staff?.name === selectedPaymentFilter
    );
  };

  const getFilteredPaymentsTotal = () => {
    return getFilteredPayments().reduce((sum, payment) => sum + payment.amount, 0);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading staff data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageTitleBar title="Staff & Salaries" showBack={false} />
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {showBasePayCard && (
          <View style={styles.yellowCard}>
            <View style={styles.yellowCardContent}>
              <Text style={styles.yellowCardText}>Add Base Pay to All Staff</Text>
              <Switch
                value={isAddingBasePay}
                onValueChange={(value) => {
                  setIsAddingBasePay(value);
                  if (value) {
                    handleAddBasePayToAll();
                  }
                }}
                disabled={isProcessing}
                trackColor={{ false: '#d1d1d1', true: '#4CAF50' }}
                thumbColor={isAddingBasePay ? '#fff' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.yellowCardDescription}>
              When enabled, this will add each staff member's base pay to their current balance.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Staff List: Pay & Balance</Text>
          
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
              <Text style={[styles.headerCell, styles.amountCell]}>Base Pay</Text>
              <Text style={[styles.headerCell, styles.amountCell]}>Balance</Text>
              <Text style={[styles.headerCell, styles.actionsCell]}>Actions</Text>
            </View>

            {staffList.map((staff) => (
              <View key={staff.id} style={styles.tableRow}>
                <Text style={[styles.cell, styles.nameCell]}>{staff.name}</Text>
                <Text style={[styles.cell, styles.amountCell]}>₹{staff.base_pay.toLocaleString()}</Text>
                <Text style={[styles.cell, styles.amountCell]}>₹{staff.current_balance.toLocaleString()}</Text>
                <View style={[styles.cell, styles.actionsCell]}>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.actionButton, styles.payButton]}
                      onPress={() => handleMakePayment(staff)}
                    >
                      <IndianRupee size={8} color="#4CAF50" />
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEditStaff(staff)}
                    >
                      <Pencil size={8} color="#2B7BB0" />
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteStaff(staff)}
                    >
                      <Trash2 size={8} color="#dc3545" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <View style={styles.filterContainer}>
              <Pressable 
                style={styles.filterDropdown}
                onPress={() => setShowPaymentFilterDropdown(!showPaymentFilterDropdown)}
              >
                <Text style={styles.filterText}>
                  {selectedPaymentFilter || 'All Staff'}
                </Text>
                <ChevronDown size={16} color="#2B7BB0" />
              </Pressable>
              
              {showPaymentFilterDropdown && (
                <View style={styles.dropdown}>
                  <Pressable 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedPaymentFilter(null);
                      setShowPaymentFilterDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      !selectedPaymentFilter && styles.selectedDropdownItem
                    ]}>
                      All Staff
                    </Text>
                  </Pressable>
                  
                  {staffList.map(staff => (
                    <Pressable 
                      key={staff.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedPaymentFilter(staff.name);
                        setShowPaymentFilterDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedPaymentFilter === staff.name && styles.selectedDropdownItem
                      ]}>
                        {staff.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.paymentsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
              <Text style={[styles.headerCell, styles.nameCell]}>Staff</Text>
              <Text style={[styles.headerCell, styles.amountCell]}>Amount</Text>
              <Text style={[styles.headerCell, styles.purposeCell]}>Purpose</Text>
            </View>

            {getFilteredPayments().map((payment) => (
              <View key={payment.id} style={styles.tableRow}>
                <Text style={[styles.cell, styles.dateCell]}>
                  {new Date(payment.payment_date).toLocaleDateString()}
                </Text>
                <Text style={[styles.cell, styles.nameCell]}>
                  {(payment.staff as any)?.name || 'Unknown'}
                </Text>
                <Text style={[styles.cell, styles.amountCell]}>₹{payment.amount.toLocaleString()}</Text>
                <Text style={[styles.cell, styles.purposeCell]}>{payment.purpose}</Text>
              </View>
            ))}
            
            {getFilteredPayments().length > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalCell, styles.dateCell]}>TOTAL</Text>
                <Text style={[styles.totalCell, styles.nameCell]}></Text>
                <Text style={[styles.totalCell, styles.amountCell]}>₹{getFilteredPaymentsTotal().toLocaleString()}</Text>
                <Text style={[styles.totalCell, styles.purposeCell]}></Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={handleAddStaff}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.addButtonText}>Add New Staff</Text>
        </Pressable>
      </ScrollView>

      <StaffEditModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStaff(null);
        }}
        onSubmit={handleSubmitStaff}
        staff={selectedStaff}
      />

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedStaff(null);
        }}
        staffName={selectedStaff?.name || ''}
        currentBalance={selectedStaff?.current_balance || 0}
        onSubmit={handlePaymentSubmit}
      />

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedStaff(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Staff Member"
        message={`Are you sure you want to delete ${selectedStaff?.name}? This action cannot be undone.`}
      />
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
    padding: 6,
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#2B7BB0',
    fontWeight: '600',
    marginBottom: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  paymentsTable: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2B7BB0',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#fff',
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  cell: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: '500',
    paddingHorizontal: 12,
    color: '#34495e',
  },
  nameCell: {
    flex: 2,
  },
  roleCell: {
    flex: 1.5,
  },
  amountCell: {
    flex: 1,
    textAlign: 'right',
  },
  actionsCell: {
    flex: 1.5,
    alignItems: 'center',
  },
  dateCell: {
    flex: 1.5,
  },
  purposeCell: {
    flex: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  payButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  editButton: {
    borderColor: '#2B7BB0',
    backgroundColor: '#f0f7ff',
  },
  deleteButton: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalCell: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: '600',
    color: '#2B7BB0',
    paddingHorizontal: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 60,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: '600',
  },
  yellowCard: {
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yellowCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  yellowCardText: {
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
    fontWeight: '600',
  },
  yellowCardDescription: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1000,
  },
  filterContainer: {
    position: 'relative',
    zIndex: 1001,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#2B7BB0',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#2B7BB0',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
    width: 200,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1002,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  selectedDropdownItem: {
    color: '#2B7BB0',
    fontWeight: '600',
  },
});