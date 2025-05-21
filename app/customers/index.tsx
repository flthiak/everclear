import ConfirmDialog from '@/components/ConfirmDialog';
import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pencil, Search, Trash2, Truck, UserPlus, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface Customer {
  id: string;
  name: string;
  address: string;
  contact_number: string;
  type: 'customer' | 'distributor';
}

export default function CustomersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'customers' | 'distributors'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{ visible: boolean; customer: Customer | null }>({
    visible: false,
    customer: null,
  });
  
  const itemsPerPage = 10; // Number of items to display per page
  
  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when tab changes
    fetchCustomers();
  }, [activeTab]);

  // Refresh data when screen comes into focus (after adding/editing)
  useFocusEffect(
    useCallback(() => {
      console.log('Customers screen focused - refreshing data');
      fetchCustomers();
      return () => {
        // Cleanup if needed
      };
    }, [activeTab])
  );

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('type', activeTab === 'customers' ? 'customer' : 'distributor')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    router.push({
      pathname: '/customers/edit',
      params: {
        id: customer.id,
        name: customer.name,
        phone: customer.contact_number || '',
        address: customer.address || '',
        type: customer.type,
      },
    });
  };

  const handleAdd = () => {
    router.push({
      pathname: '/customers/add',
      params: {
        type: activeTab === 'customers' ? 'customer' : 'distributor',
      },
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.customer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteConfirm.customer.id);

      if (error) throw error;
      
      setCustomers(prev => prev.filter(c => c.id !== deleteConfirm.customer?.id));
      setDeleteConfirm({ visible: false, customer: null });
    } catch (err) {
      console.error('Error deleting customer:', err);
    }
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.contact_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  
  // Get current page items
  const currentPageItems = filteredCustomers.length <= itemsPerPage 
    ? filteredCustomers 
    : filteredCustomers.slice(
        (currentPage - 1) * itemsPerPage, 
        currentPage * itemsPerPage
      );
  
  // Handle page navigation
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <View style={styles.container}>
<PageTitleBar title="Customers & Distributors" showBack={false} />

      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'customers' && styles.activeTab]}
            onPress={() => setActiveTab('customers')}
          >
            <Users size={16} color={activeTab === 'customers' ? '#fff' : '#666'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'customers' && styles.activeTabText]}>
              Customers
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'distributors' && styles.activeTab]}
            onPress={() => setActiveTab('distributors')}
          >
            <Truck size={16} color={activeTab === 'distributors' ? '#fff' : '#666'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'distributors' && styles.activeTabText]}>
              Distributors
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab} by name or phone`}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setCurrentPage(1); // Reset to first page when search query changes
            }}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
            <Text style={[styles.headerCell, styles.addressCell]}>Address</Text>
            <Text style={[styles.headerCell, styles.phoneCell]}>Phone</Text>
            <Text style={[styles.headerCell, styles.actionsCell]}>Actions</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2B7BB0" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : filteredCustomers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No {activeTab} found. Add your first {activeTab === 'customers' ? 'customer' : 'distributor'}.
              </Text>
            </View>
          ) : (
            currentPageItems.map((customer) => (
              <View key={customer.id} style={styles.tableRow}>
                <Text style={[styles.cell, styles.nameCell]}>{customer.name}</Text>
                <Text style={[styles.cell, styles.addressCell]}>{customer.address}</Text>
                <Text style={[styles.cell, styles.phoneCell]}>{customer.contact_number}</Text>
                <View style={[styles.cell, styles.actionsCell]}>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEdit(customer)}
                    >
                      <Pencil size={14} color="#2B7BB0" />
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => setDeleteConfirm({ visible: true, customer })}
                    >
                      <Trash2 size={14} color="#dc3545" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <Pressable
          style={styles.addButton}
          onPress={handleAdd}
        >
          <UserPlus size={18} color="#fff" />
          <Text style={styles.addButtonText}>
            Add New {activeTab === 'customers' ? 'Customer' : 'Distributor'}
          </Text>
        </Pressable>
        
        {/* Pagination Controls */}
        {!isLoading && filteredCustomers.length > itemsPerPage && (
          <View style={styles.paginationContainer}>
            <Pressable
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={goToPrevPage}
              disabled={currentPage === 1}
            >
              <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                Previous
              </Text>
            </Pressable>
            
            <Text style={styles.paginationText}>
              Page {currentPage} of {totalPages} • Showing {currentPageItems.length} of {filteredCustomers.length}
            </Text>
            
            <Pressable
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                Next
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={deleteConfirm.visible}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${deleteConfirm.customer?.name}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ visible: false, customer: null })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  headerText: {
    fontSize: 19,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#2B7BB0',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 8,
  },
  tabIcon: {
    marginRight: 4,
  },
  activeTab: {
    backgroundColor: '#2B7BB0',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2B7BB0',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#fff',
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  cell: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  nameCell: {
    flex: 2,
  },
  addressCell: {
    flex: 2,
  },
  phoneCell: {
    flex: 1.5,
  },
  actionsCell: {
    flex: 1,
    alignItems: 'center',
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
  editButton: {
    borderColor: '#2B7BB0',
    backgroundColor: '#f0f7ff',
  },
  deleteButton: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 6,
    gap: 8,
    marginBottom: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'AsapCondensed_400Regular',
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paginationButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2B7BB0',
    borderRadius: 4,
  },
  paginationButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  paginationButtonText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#fff',
    fontWeight: '500',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  paginationText: {
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    color: '#666',
    marginHorizontal: 16,
    fontWeight: '500',
  },
});