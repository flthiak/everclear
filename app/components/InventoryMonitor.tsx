import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, Modal, ScrollView, Alert, Share } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Filter, Search, X, ArrowDownUp, AlertTriangle, Info, Share2, ChevronRight } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  location: 'Factory' | 'Godown';
  price?: number;
  product_sn?: string;
}

type SortField = 'product_name' | 'quantity';
type SortOrder = 'asc' | 'desc';

const InventoryMonitor = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<'All' | 'Factory' | 'Godown'>('All');
  const [sortField, setSortField] = useState<SortField>('product_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showLowStock, setShowLowStock] = useState(false);
  const LOW_STOCK_THRESHOLD = 5; // Consider anything below 5 as low stock
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Fetch stock data from both locations
  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);
      try {
        // Fetch factory stock
        const { data: factoryData, error: factoryError } = await supabase
          .from('factory_stock')
          .select(`
            id,
            product_id,
            quantity,
            product:products (
              product_name,
              factory_price,
              product_sn
            )
          `);

        if (factoryError) throw factoryError;

        // Fetch godown stock
        const { data: godownData, error: godownError } = await supabase
          .from('godown_stock')
          .select(`
            id,
            product_id,
            quantity,
            product:products (
              product_name,
              godown_price,
              product_sn
            )
          `);

        if (godownError) throw godownError;

        // Transform and combine data
        const factoryItems = (factoryData || []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product.product_name,
          quantity: item.quantity,
          price: item.product.factory_price,
          product_sn: item.product.product_sn,
          location: 'Factory' as const
        }));

        const godownItems = (godownData || []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product.product_name,
          quantity: item.quantity,
          price: item.product.godown_price,
          product_sn: item.product.product_sn,
          location: 'Godown' as const
        }));

        setStockItems([...factoryItems, ...godownItems]);
      } catch (error) {
        console.error('Error fetching stock data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, []);

  // Filter and sort the stock items
  const getFilteredItems = () => {
    return stockItems
      .filter(item => {
        const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLocation = locationFilter === 'All' || item.location === locationFilter;
        const matchesLowStock = !showLowStock || item.quantity < LOW_STOCK_THRESHOLD;
        return matchesSearch && matchesLocation && matchesLowStock;
      })
      .sort((a, b) => {
        if (sortField === 'product_name') {
          return sortOrder === 'asc'
            ? a.product_name.localeCompare(b.product_name)
            : b.product_name.localeCompare(a.product_name);
        } else {
          return sortOrder === 'asc'
            ? a.quantity - b.quantity
            : b.quantity - a.quantity;
        }
      });
  };

  // Toggle sort order or change sort field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Clear search query
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Toggle location filter
  const toggleLocationFilter = () => {
    if (locationFilter === 'All') setLocationFilter('Factory');
    else if (locationFilter === 'Factory') setLocationFilter('Godown');
    else setLocationFilter('All');
  };

  // Toggle low stock filter
  const toggleLowStockFilter = () => {
    setShowLowStock(!showLowStock);
  };

  const handleExportData = async () => {
    try {
      const filteredItems = getFilteredItems();
      
      if (filteredItems.length === 0) {
        Alert.alert('Export Error', 'No items to export');
        return;
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `inventory-${timestamp}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Create CSV header
      let csvContent = 'Product Name,Location,Quantity,Price,Product SN\n';
      
      // Add data rows
      filteredItems.forEach(item => {
        csvContent += `"${item.product_name}","${item.location}",${item.quantity},${item.price || 0},"${item.product_sn || ''}"\n`;
      });
      
      // Write the file
      await FileSystem.writeAsStringAsync(filePath, csvContent);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Inventory Data',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Export Error', 'Failed to export inventory data');
    }
  };

  const handleItemPress = (item: StockItem) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedItem(null);
  };

  // Render the list item
  const renderItem = ({ item }: { item: StockItem }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product_name}</Text>
        <Text style={styles.itemInfo}>
          SN: {item.product_sn || 'N/A'} | Price: ₹{item.price || 0}
        </Text>
      </View>
      <View style={styles.itemQuantity}>
        <View style={styles.quantityContainer}>
          {item.quantity < LOW_STOCK_THRESHOLD && (
            <AlertTriangle size={14} color="#ff6b6b" style={styles.lowStockIcon} />
          )}
          <Text 
            style={[
              styles.quantityText, 
              item.quantity < LOW_STOCK_THRESHOLD && styles.lowStockText
            ]}
          >
            {item.quantity}
          </Text>
        </View>
        <View style={[styles.locationBadge, item.location === 'Factory' ? styles.factoryBadge : styles.godownBadge]}>
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
      </View>
      <ChevronRight size={16} color="#ccc" />
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B7BB0" />
        <Text style={styles.loadingText}>Loading inventory data...</Text>
      </View>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory List</Text>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: locationFilter !== 'All' ? '#e0f2fe' : '#f0f0f0' }]}
          onPress={toggleLocationFilter}
        >
          <Filter size={16} color={locationFilter !== 'All' ? '#2B7BB0' : '#666'} />
          <Text style={[styles.filterText, { color: locationFilter !== 'All' ? '#2B7BB0' : '#666' }]}>
            {locationFilter}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: showLowStock ? '#ffe0e0' : '#f0f0f0' }]}
          onPress={toggleLowStockFilter}
        >
          <AlertTriangle size={16} color={showLowStock ? '#ff6b6b' : '#666'} />
          <Text style={[styles.filterText, { color: showLowStock ? '#ff6b6b' : '#666' }]}>
            Low Stock
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <TouchableOpacity style={styles.sortButton} onPress={() => handleSort('product_name')}>
          <Text style={styles.listHeaderText}>Product</Text>
          {sortField === 'product_name' && (
            <ArrowDownUp size={14} color="#2B7BB0" style={[styles.sortIcon, sortOrder === 'desc' && styles.sortReversed]} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.sortButton} onPress={() => handleSort('quantity')}>
          <Text style={styles.listHeaderText}>Quantity</Text>
          {sortField === 'quantity' && (
            <ArrowDownUp size={14} color="#2B7BB0" style={[styles.sortIcon, sortOrder === 'desc' && styles.sortReversed]} />
          )}
        </TouchableOpacity>
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No inventory items found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.location}-${item.id}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Total Items: {filteredItems.length} | 
          Factory: {filteredItems.filter(item => item.location === 'Factory').length} | 
          Godown: {filteredItems.filter(item => item.location === 'Godown').length}
        </Text>
      </View>

      <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
        <Share2 size={20} color="#fff" />
        <Text style={styles.exportButtonText}>Export Inventory</Text>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Item Details</Text>
              <TouchableOpacity onPress={closeDetailModal} style={styles.closeButton}>
                <X size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {selectedItem && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Product Name</Text>
                    <Text style={styles.detailValue}>{selectedItem.product_name}</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <View style={[styles.locationBadge, selectedItem.location === 'Factory' ? styles.factoryBadge : styles.godownBadge, styles.detailBadge]}>
                      <Text style={styles.locationText}>{selectedItem.location}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={[styles.detailValue, selectedItem.quantity < LOW_STOCK_THRESHOLD && styles.lowStockText]}>
                      {selectedItem.quantity} {selectedItem.quantity < LOW_STOCK_THRESHOLD && '(Low Stock)'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Price</Text>
                    <Text style={styles.detailValue}>₹{selectedItem.price || 0}</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Product Serial Number</Text>
                    <Text style={styles.detailValue}>{selectedItem.product_sn || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Product ID</Text>
                    <Text style={styles.detailValue}>{selectedItem.product_id}</Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f6fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#666',
  },
  listHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginHorizontal: 8,
    borderRadius: 8,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortIcon: {
    marginLeft: 4,
  },
  sortReversed: {
    transform: [{ rotate: '180deg' }],
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemInfo: {
    fontSize: 12,
    color: '#666',
  },
  itemQuantity: {
    alignItems: 'flex-end',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  locationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  factoryBadge: {
    backgroundColor: '#e0f2fe',
  },
  godownBadge: {
    backgroundColor: '#dcfce7',
  },
  locationText: {
    fontSize: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  listContent: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  summary: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  lowStockIcon: {
    marginRight: 4,
  },
  lowStockText: {
    color: '#ff6b6b',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
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
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  detailBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});

export default InventoryMonitor; 