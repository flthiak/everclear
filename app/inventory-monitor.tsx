import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, Modal, ScrollView, Alert, Share, Dimensions, Platform, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ListFilter as Filter, Search, X, ArrowDownUp, TriangleAlert as AlertTriangle, Info, Share2, ChevronRight, ChartBar as BarChart2, RefreshCw, Package, Truck, Zap } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import PageTitleBar from '@/components/PageTitleBar';
import BottomNavBar from '@/components/BottomNavBar';
import InventoryTrend from './components/InventoryTrend';

interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  location: 'Factory' | 'Godown';
  price?: number;
  product_sn?: string;
  value?: number;
  status?: 'low' | 'normal' | 'high';
}

type SortField = 'product_name' | 'quantity' | 'value';
type SortOrder = 'asc' | 'desc';

const InventoryMonitor = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<'All' | 'Factory' | 'Godown'>('All');
  const [sortField, setSortField] = useState<SortField>('product_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'normal' | 'high'>('all');
  const LOW_STOCK_THRESHOLD = 10;
  const HIGH_STOCK_THRESHOLD = 100;
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [factoryValue, setFactoryValue] = useState(0);
  const [godownValue, setGodownValue] = useState(0);
  const [stockSummary, setStockSummary] = useState({
    totalItems: 0,
    factoryItems: 0,
    godownItems: 0,
    lowStockItems: 0
  });

  // Fetch stock data from both locations
  useEffect(() => {
    fetchStockData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStockData();
    setRefreshing(false);
  };
  
  // Fetch stock data from both locations
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
          product_name,
          product_sn,
          products (
            id,
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
          product_name,
          product_sn,
          products (
            id,
            product_name,
            godown_price,
            product_sn
          )
        `);

      if (godownError) throw godownError;

      // Transform and combine data
      const factoryItems = (factoryData || []).map((item: any) => {
        const price = item.products?.factory_price || 0;
        const value = item.quantity * price;
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name || (item.products?.product_name || 'Unknown Product'),
          quantity: item.quantity,
          price: price,
          product_sn: item.product_sn || item.products?.product_sn,
          location: 'Factory' as const,
          value: value,
          status: getStockStatus(item.quantity)
        };
      });

      const godownItems = (godownData || []).map((item: any) => {
        const price = item.products?.godown_price || 0;
        const value = item.quantity * price;
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name || (item.products?.product_name || 'Unknown Product'),
          quantity: item.quantity,
          price: price,
          product_sn: item.product_sn || item.products?.product_sn,
          location: 'Godown' as const,
          value: value,
          status: getStockStatus(item.quantity)
        };
      });

      const allItems = [...factoryItems, ...godownItems];
      
      // Calculate total values
      const totalVal = allItems.reduce((sum, item) => sum + (item.value || 0), 0);
      const factoryVal = factoryItems.reduce((sum, item) => sum + (item.value || 0), 0);
      const godownVal = godownItems.reduce((sum, item) => sum + (item.value || 0), 0);
      
      setTotalValue(totalVal);
      setFactoryValue(factoryVal);
      setGodownValue(godownVal);
      
      // Calculate summary statistics
      setStockSummary({
        totalItems: allItems.length,
        factoryItems: factoryItems.length,
        godownItems: godownItems.length,
        lowStockItems: allItems.filter(item => item.quantity < LOW_STOCK_THRESHOLD).length
      });

      setStockItems(allItems);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      Alert.alert('Error', 'Failed to load inventory data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Determine stock status based on quantity
  const getStockStatus = (quantity: number): 'low' | 'normal' | 'high' => {
    if (quantity < LOW_STOCK_THRESHOLD) return 'low';
    if (quantity > HIGH_STOCK_THRESHOLD) return 'high';
    return 'normal';
  };

  // Filter and sort the stock items
  const getFilteredItems = () => {
    return stockItems
      .filter(item => {
        const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (item.product_sn && item.product_sn.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesLocation = locationFilter === 'All' || item.location === locationFilter;
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesLocation && matchesStatus;
      })
      .sort((a, b) => {
        if (sortField === 'product_name') {
          return sortOrder === 'asc'
            ? a.product_name.localeCompare(b.product_name)
            : b.product_name.localeCompare(a.product_name);
        } else if (sortField === 'value') {
          const aValue = a.value || 0;
          const bValue = b.value || 0;
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
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

  // Export data to CSV
  const handleExportData = async () => {
    try {
      const filteredItems = getFilteredItems();
      
      if (filteredItems.length === 0) {
        Alert.alert('Export Error', 'No items to export');
        return;
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `inventory-${timestamp}.csv`;
      
      // Create CSV header
      let csvContent = 'Product Name,Location,Quantity,Price,Value,Product SN,Status\n';
      
      // Add data rows
      filteredItems.forEach(item => {
        csvContent += `"${item.product_name}","${item.location}",${item.quantity},${item.price || 0},${item.value || 0},"${item.product_sn || ''}","${item.status}"\n`;
      });
      
      if (Platform.OS === 'web') {
        // For web, create a download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For mobile platforms
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;
        
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

  const filteredItems = getFilteredItems();
  const screenWidth = Dimensions.get('window').width;

  // Render the list item
  const renderItem = ({ item }: { item: StockItem }) => (
    <TouchableOpacity 
      style={[
        styles.itemContainer,
        item.status === 'low' && styles.lowStockItem,
        item.status === 'high' && styles.highStockItem
      ]}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product_name}</Text>
        <Text style={styles.itemInfo}>
          SN: {item.product_sn || 'N/A'} | Price: ₹{item.price?.toFixed(2) || '0.00'}
        </Text>
      </View>
      <View style={styles.itemQuantity}>
        <View style={styles.quantityContainer}>
          {item.status === 'low' && (
            <AlertTriangle size={14} color="#ff6b6b" style={styles.statusIcon} />
          )}
          {item.status === 'high' && (
            <Zap size={14} color="#4CAF50" style={styles.statusIcon} />
          )}
          <Text 
            style={[
              styles.quantityText, 
              item.status === 'low' && styles.lowStockText,
              item.status === 'high' && styles.highStockText
            ]}
          >
            {item.quantity}
          </Text>
        </View>
        <View style={[
          styles.locationBadge, 
          item.location === 'Factory' ? styles.factoryBadge : styles.godownBadge
        ]}>
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
        <Text style={styles.valueText}>₹{item.value?.toFixed(2) || '0.00'}</Text>
      </View>
      <ChevronRight size={16} color="#ccc" />
    </TouchableOpacity>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.fullContainer}>
        <PageTitleBar title="Inventory Monitor" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B7BB0" />
          <Text style={styles.loadingText}>Loading inventory data...</Text>
        </View>
        <BottomNavBar activeTab="stock" />
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <PageTitleBar title="Inventory Monitor" showBack={true} />
      
      <View style={styles.container}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <LinearGradient
            colors={['#2193b0', '#6dd5ed']}
            style={styles.summaryCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Total Value</Text>
              <Text style={styles.summaryValue}>₹{totalValue.toLocaleString()}</Text>
            </View>
            <Package size={36} color="rgba(255,255,255,0.3)" style={styles.summaryIcon} />
          </LinearGradient>
          
          <View style={styles.smallCardRow}>
            <LinearGradient
              colors={['#11998e', '#38ef7d']}
              style={styles.smallCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.summaryContent}>
                <Text style={styles.smallCardTitle}>Factory</Text>
                <Text style={styles.smallCardValue}>₹{factoryValue.toLocaleString()}</Text>
              </View>
              <Factory size={24} color="rgba(255,255,255,0.3)" style={styles.smallCardIcon} />
            </LinearGradient>
            
            <LinearGradient
              colors={['#4e54c8', '#8f94fb']}
              style={styles.smallCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.summaryContent}>
                <Text style={styles.smallCardTitle}>Godown</Text>
                <Text style={styles.smallCardValue}>₹{godownValue.toLocaleString()}</Text>
              </View>
              <Truck size={24} color="rgba(255,255,255,0.3)" style={styles.smallCardIcon} />
            </LinearGradient>
          </View>
        </View>
        
        {/* Inventory Trend Chart */}
        <InventoryTrend />
        
        {/* Filter Container */}
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
            style={[styles.filterButton, { backgroundColor: statusFilter !== 'all' ? '#ffe0e0' : '#f0f0f0' }]}
            onPress={() => setShowStatusFilter(!showStatusFilter)}
          >
            <AlertTriangle size={16} color={statusFilter !== 'all' ? '#ff6b6b' : '#666'} />
            <Text style={[styles.filterText, { color: statusFilter !== 'all' ? '#ff6b6b' : '#666' }]}>
              {statusFilter === 'all' ? 'Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Status Filter Dropdown */}
        {showStatusFilter && (
          <View style={styles.statusDropdown}>
            <TouchableOpacity 
              style={[styles.statusOption, statusFilter === 'all' && styles.selectedStatusOption]}
              onPress={() => {
                setStatusFilter('all');
                setShowStatusFilter(false);
              }}
            >
              <Text style={styles.statusOptionText}>All Items</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statusOption, statusFilter === 'low' && styles.selectedStatusOption]}
              onPress={() => {
                setStatusFilter('low');
                setShowStatusFilter(false);
              }}
            >
              <AlertTriangle size={14} color="#ff6b6b" />
              <Text style={styles.statusOptionText}>Low Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statusOption, statusFilter === 'normal' && styles.selectedStatusOption]}
              onPress={() => {
                setStatusFilter('normal');
                setShowStatusFilter(false);
              }}
            >
              <Package size={14} color="#2B7BB0" />
              <Text style={styles.statusOptionText}>Normal Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statusOption, statusFilter === 'high' && styles.selectedStatusOption]}
              onPress={() => {
                setStatusFilter('high');
                setShowStatusFilter(false);
              }}
            >
              <Zap size={14} color="#4CAF50" />
              <Text style={styles.statusOptionText}>High Stock</Text>
            </TouchableOpacity>
          </View>
        )}

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
          <TouchableOpacity style={styles.sortButton} onPress={() => handleSort('value')}>
            <Text style={styles.listHeaderText}>Value</Text>
            {sortField === 'value' && (
              <ArrowDownUp size={14} color="#2B7BB0" style={[styles.sortIcon, sortOrder === 'desc' && styles.sortReversed]} />
            )}
          </TouchableOpacity>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No inventory items found matching your filters.</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <RefreshCw size={16} color="#fff" />
              <Text style={styles.refreshButtonText}>Refresh Data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={(item) => `${item.location}-${item.id}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
            
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                Showing {filteredItems.length} of {stockItems.length} items | 
                Factory: {stockItems.filter(item => item.location === 'Factory').length} | 
                Godown: {stockItems.filter(item => item.location === 'Godown').length} |
                Low Stock: {stockItems.filter(item => item.status === 'low').length}
              </Text>
            </View>

            <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
              <Share2 size={20} color="#fff" />
              <Text style={styles.exportButtonText}>Export Inventory</Text>
            </TouchableOpacity>
          </>
        )}

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
                    <View style={styles.detailHeader}>
                      <View style={[
                        styles.detailStatusBadge,
                        selectedItem.status === 'low' && styles.lowStatusBadge,
                        selectedItem.status === 'normal' && styles.normalStatusBadge,
                        selectedItem.status === 'high' && styles.highStatusBadge,
                      ]}>
                        {selectedItem.status === 'low' && <AlertTriangle size={16} color="#fff" />}
                        {selectedItem.status === 'normal' && <Package size={16} color="#fff" />}
                        {selectedItem.status === 'high' && <Zap size={16} color="#fff" />}
                        <Text style={styles.detailStatusText}>
                          {selectedItem.status === 'low' ? 'Low Stock' : 
                           selectedItem.status === 'high' ? 'High Stock' : 'Normal Stock'}
                        </Text>
                      </View>
                      
                      <View style={[
                        styles.locationBadge,
                        selectedItem.location === 'Factory' ? styles.factoryBadge : styles.godownBadge,
                        styles.detailLocationBadge
                      ]}>
                        {selectedItem.location === 'Factory' ? 
                          <Factory size={16} color="#fff" /> : 
                          <Truck size={16} color="#fff" />
                        }
                        <Text style={[styles.locationText, styles.detailLocationText]}>
                          {selectedItem.location}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.detailProductName}>{selectedItem.product_name}</Text>
                    
                    <View style={styles.detailGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Product ID</Text>
                        <Text style={styles.detailValue}>{selectedItem.product_sn || 'N/A'}</Text>
                      </View>
                      
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Quantity</Text>
                        <Text style={[
                          styles.detailValue, 
                          styles.quantityValue,
                          selectedItem.status === 'low' && styles.lowStockText,
                          selectedItem.status === 'high' && styles.highStockText
                        ]}>
                          {selectedItem.quantity}
                        </Text>
                      </View>
                      
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Unit Price</Text>
                        <Text style={styles.detailValue}>₹{selectedItem.price?.toFixed(2) || '0.00'}</Text>
                      </View>
                      
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Total Value</Text>
                        <Text style={styles.detailValue}>₹{selectedItem.value?.toFixed(2) || '0.00'}</Text>
                      </View>
                    </View>
                    
                    {selectedItem.status === 'low' && (
                      <View style={styles.warningBox}>
                        <AlertTriangle size={20} color="#ff6b6b" />
                        <Text style={styles.warningText}>
                          This item is below the recommended stock level of {LOW_STOCK_THRESHOLD} units.
                          Consider restocking soon.
                        </Text>
                      </View>
                    )}
                    
                    {selectedItem.status === 'high' && (
                      <View style={styles.infoBox}>
                        <Info size={20} color="#4CAF50" />
                        <Text style={styles.infoText}>
                          This item has high stock levels (above {HIGH_STOCK_THRESHOLD} units).
                          Consider adjusting production or transferring stock.
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity style={styles.actionButton}>
                        <BarChart2 size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>View History</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.transferButton]}
                        onPress={() => {
                          closeDetailModal();
                          Alert.alert(
                            'Feature Coming Soon',
                            'The transfer functionality will be available in the next update.'
                          );
                        }}
                      >
                        {selectedItem.location === 'Factory' ? (
                          <>
                            <Truck size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Send to Godown</Text>
                          </>
                        ) : (
                          <>
                            <Factory size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Return to Factory</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
      
      <BottomNavBar activeTab="stock" />
    </View>
  );
};

// Custom Factory icon component
const Factory = ({ size, color, style }: { size: number, color: string, style?: any }) => {
  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <Path d="M17 18h1" />
        <Path d="M12 18h1" />
        <Path d="M7 18h1" />
      </Svg>
    </View>
  );
};

// Import SVG components for Factory icon
import Svg, { Path } from 'react-native-svg';

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // Space for bottom nav
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    fontFamily: 'AsapCondensed_400Regular',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  summaryIcon: {
    opacity: 0.8,
  },
  smallCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallCard: {
    width: '48.5%',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  smallCardTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
    fontFamily: 'AsapCondensed_400Regular',
  },
  smallCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  smallCardIcon: {
    opacity: 0.8,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    zIndex: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  statusDropdown: {
    position: 'absolute',
    top: 180, // Adjust based on your layout
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    zIndex: 20,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 4,
  },
  selectedStatusOption: {
    backgroundColor: '#f0f7ff',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  listHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lowStockItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  highStockItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  itemDetails: {
    flex: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'AsapCondensed_400Regular',
  },
  itemInfo: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  itemQuantity: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  valueText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  locationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B7BB0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  summary: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  lowStockText: {
    color: '#ff6b6b',
  },
  highStockText: {
    color: '#4CAF50',
  },
  statusIcon: {
    marginRight: 4,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
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
    fontSize: 15,
    fontFamily: 'AsapCondensed_400Regular',
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
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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
    fontFamily: 'AsapCondensed_400Regular',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lowStatusBadge: {
    backgroundColor: '#ff6b6b',
  },
  normalStatusBadge: {
    backgroundColor: '#2B7BB0',
  },
  highStatusBadge: {
    backgroundColor: '#4CAF50',
  },
  detailStatusText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  detailLocationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  detailLocationText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  detailProductName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'AsapCondensed_400Regular',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  quantityValue: {
    fontSize: 24,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'AsapCondensed_400Regular',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0fff4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'AsapCondensed_400Regular',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B7BB0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  transferButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
});

export default InventoryMonitor;