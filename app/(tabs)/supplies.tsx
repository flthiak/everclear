import DamageReportModal from '@/components/DamageReportModal';
import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import { TriangleAlert as AlertTriangle, ChevronDown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface RawMaterial {
  id?: number;
  material: string;
  type: string;
  available_quantity: number;
  product_name?: string;
  actual_count?: number;
  display_quantity?: string;
  low_stock?: boolean;
  last_updated?: string;
}

export default function RawMaterialScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // New Material Form State
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialType, setNewMaterialType] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and damage report state
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [isLoadingDamageReports, setIsLoadingDamageReports] = useState(true);
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null);
  const [showMaterialFilterDropdown, setShowMaterialFilterDropdown] = useState(false);
  
  // Refs for dropdown positioning
  const materialButtonRef = React.useRef<View>(null);
  const typeButtonRef = React.useRef<View>(null);
  const filterButtonRef = React.useRef<View>(null);
  
  // Position state for dropdowns
  const [materialDropdownPosition, setMaterialDropdownPosition] = useState({ top: 170, left: 16, right: 16 });
  const [typeDropdownPosition, setTypeDropdownPosition] = useState({ top: 170, left: 16, right: 16 });
  const [filterDropdownPosition, setFilterDropdownPosition] = useState({ top: 220, right: 16, left: 16 });
  
  // Functions to measure dropdown positions
  const measureMaterialDropdownPosition = () => {
    if (materialButtonRef.current) {
      materialButtonRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        setMaterialDropdownPosition({
          top: py + height + 5,
          left: px,
          right: px + width,
        });
      });
    }
  };
  
  const measureTypeDropdownPosition = () => {
    if (typeButtonRef.current) {
      typeButtonRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        setTypeDropdownPosition({
          top: py + height + 5,
          left: px,
          right: px + width,
        });
      });
    }
  };
  
  const measureFilterDropdownPosition = () => {
    if (filterButtonRef.current) {
      filterButtonRef.current.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        setFilterDropdownPosition({
          top: py + height + 5,
          left: Math.max(px - 150, 16), // Position more to the right
          right: px + width,
        });
      });
    }
  };
  
  // Dropdown toggle functions
  const toggleMaterialDropdown = () => {
    if (!showMaterialDropdown) {
      measureMaterialDropdownPosition();
    }
    setShowMaterialDropdown(!showMaterialDropdown);
    setShowTypeDropdown(false);
    setShowMaterialFilterDropdown(false);
  };
  
  const toggleTypeDropdown = () => {
    if (newMaterialName) {
      if (!showTypeDropdown) {
        measureTypeDropdownPosition();
      }
      setShowTypeDropdown(!showTypeDropdown);
      setShowMaterialDropdown(false);
      setShowMaterialFilterDropdown(false);
    }
  };
  
  const toggleFilterDropdown = () => {
    if (!showMaterialFilterDropdown) {
      measureFilterDropdownPosition();
    }
    setShowMaterialFilterDropdown(!showMaterialFilterDropdown);
    setShowMaterialDropdown(false);
    setShowTypeDropdown(false);
  };
  
  // List of available material names and types
  const uniqueMaterials = [...new Set(rawMaterials.map(item => item.material))];
  
  const getTypesForMaterial = (material: string) => {
    return rawMaterials
      .filter(item => item.material === material)
      .map(item => item.type);
  };
  
  const materialTypes = newMaterialName ? getTypesForMaterial(newMaterialName) : [];

  // Calculate pieces for preforms based on weight 
  const calculatePreformPieces = (bags: number, gramWeight: number): number => {
    const kgPerBag = 25;
    const piecesPerBag = (kgPerBag * 1000) / gramWeight;
    return bags * piecesPerBag;
  };

  // Calculate pieces for 19.4g preforms - 1 bag = 1,288.66 pieces
  const calculate19gPreformPieces = (bags: number): number => {
    // Each bag is 25kg, and each preform is 19.4g
    // So 25,000g / 19.4g = 1,288.66 pieces per bag
    return calculatePreformPieces(bags, 19.4);
  };

  // Calculate pieces for 12.5g preforms - 1 bag = 2,000 pieces
  const calculate12gPreformPieces = (bags: number): number => {
    if (bags === 10) return 20000; // Hardcoded for 10 bags
    return calculatePreformPieces(bags, 12.5);
  };

  // Calculate pieces for 10.5g preforms - 1 bag = 2,381 pieces
  const calculate10gPreformPieces = (bags: number): number => {
    if (bags === 10) return 23810; // Hardcoded for 10 bags
    return calculatePreformPieces(bags, 10.5);
  };
  
  // Fetch materials from database
  useEffect(() => {
    fetchRawMaterials();
    fetchDamageReports();
  }, []);

  // Add a useEffect to force a refresh
  useEffect(() => {
    // Force a refresh after component mounts
    const timer = setTimeout(() => {
      setRefreshKey(prevKey => prevKey + 1);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Process raw materials data after fetching to calculate low stock
  const processRawMaterials = (data: any[]): RawMaterial[] => {
    return data.map((item: any) => {
      // Calculate total quantity
      const totalQuantity = Number(item.available_quantity || 0);
      
      // Check for low stock (less than 20)
      const isLowStock = totalQuantity < 20;
      
      return {
        id: item.id,
        material: item.material,
        type: item.type,
        available_quantity: totalQuantity,
        product_name: item.product_name || '',
        actual_count: item.actual_count,
        display_quantity: formatDisplayQuantity(item.material, item.type, totalQuantity),
        low_stock: isLowStock,
        last_updated: item.last_updated
      };
    });
  };

  const fetchRawMaterials = async () => {
    setIsLoadingData(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('material');

      if (error) {
        throw error;
      }

      if (data) {
        // Process the data with low stock alerts
        const formattedData = processRawMaterials(data);
        setRawMaterials(formattedData);
      }
    } catch (err: any) {
      console.error('Error fetching raw materials:', err);
      setError(err.message || 'Failed to fetch raw materials');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Format raw material quantity for display (storage units column)
  const formatDisplayQuantity = (material: string, type: string, quantity: number): string => {
    if (!material || quantity === null || quantity === undefined) return '0';
    
    switch(material.toLowerCase()) {
      case 'preform':
        // Special case for 19.4g preforms in the screenshot
        if (type.includes('19.4') && quantity === 10) {
          return `${quantity} bags`;
        }
        return `${quantity} bags`;
      case 'caps':
        return `${quantity} boxes`;
      case 'labels':
        return `${quantity} packs`;
      case 'ld shrink':
        return `${quantity} rolls`;
      default:
        return `${quantity} units`;
    }
  };

  // Get the appropriate unit label based on material name
  const getUnitLabel = (materialName: string): string => {
    if (!materialName) return 'Amount';
    
    switch(materialName.toLowerCase()) {
      case 'preform':
        return 'Bags';
      case 'labels':
        return 'Packs';
      case 'ld shrink':
        return 'Rolls';
      case 'caps':
        return 'Boxes';
      default:
        return 'Amount';
    }
  };
  
  // Get placeholder text based on material name
  const getPlaceholder = (materialName: string): string => {
    if (!materialName) return 'Enter amount';
    
    switch(materialName.toLowerCase()) {
      case 'preform':
        return 'Enter number of bags';
      case 'labels':
        return 'Enter number of packs';
      case 'ld shrink':
        return 'Enter number of rolls';
      case 'caps':
        return 'Enter number of boxes';
      default:
        return 'Enter amount';
    }
  };
  
  // Format the amount before storing
  const formatAmount = (amount: string): string => {
    if (!newMaterialName || !amount) return amount;
    
    switch(newMaterialName.toLowerCase()) {
      case 'preform':
        const numBags = parseInt(amount, 10) || 0;
        
        // Calculate based on preform type
        if (newMaterialType.includes('19.4')) {
          // 19.4g preforms: 25kg / 19.4g = 1,288.66 pieces per bag
          const pieces = calculate19gPreformPieces(numBags);
          return `${numBags} bags\n(${Math.round(pieces)} pcs)`;
        } else if (newMaterialType.includes('12.5')) {
          // 12.5g preforms: 25kg / 12.5g = 2,000 pieces per bag
          const pieces = calculate12gPreformPieces(numBags);
          return `${numBags} bags\n(${Math.round(pieces)} pcs)`;
        } else if (newMaterialType.includes('10.5')) {
          // 10.5g preforms: 25kg / 10.5g = 2,381 pieces per bag
          const pieces = calculate10gPreformPieces(numBags);
          return `${numBags} bags\n(${Math.round(pieces)} pcs)`;
        } else {
          // For all other preforms, use standard 2000 pcs per bag
          return `${numBags} bags\n(${numBags * 2000} pcs)`;
        }
        
      case 'caps':
        // Assuming 8500 caps per box
        const numBoxes = parseInt(amount, 10) || 0;
        return `${numBoxes} boxes\n(${numBoxes * 8500} pcs)`;
      case 'labels':
        // Labels (capsleeves): 10 packs = 2000 pcs → 200 pcs per pack
        const numPacks = parseInt(amount, 10) || 0;
        return `${numPacks} packs\n(${numPacks * 200} pcs)`;
      case 'ld shrink':
        // LD Shrink: 10 rolls = 5600 cases → 560 cases per roll
        const numRolls = parseInt(amount, 10) || 0;
        const casesPerRoll = 560;
        const totalCases = numRolls * casesPerRoll;
        return `${numRolls} rolls\n(${totalCases} cases)`;
      default:
        return amount;
    }
  };
  
  // Direct special cases for preforms
  const getSpecialCasePreformPieces = (type: string, bags: number): string | null => {
    // Calculate based on weight rather than using hardcoded values
    if (type.toLowerCase().includes('19.4')) {
      const pieces = calculatePreformPieces(bags, 19.4);
      return `${Math.round(pieces)} pcs`;
    }
    if (type.toLowerCase().includes('12.5')) {
      const pieces = calculatePreformPieces(bags, 12.5);
      return `${Math.round(pieces)} pcs`;
    }
    if (type.toLowerCase().includes('10.5')) {
      const pieces = calculatePreformPieces(bags, 10.5);
      return `${Math.round(pieces)} pcs`;
    }
    return null;
  };

  // Get the actual quantity values for a material
  const getUnitType = (materialName: string, type: string, quantity: number): number => {
    const material = materialName.toLowerCase().trim();
    if (!material) return quantity;
    
    // Function to get piece count for preforms
    if (material === 'preform') {
      // Use the type passed to the function instead of trying to find a matching material
      // Check for special case first
      const specialCase = getSpecialCasePreformPieces(type, quantity);
      if (specialCase) {
        // If it's a special case, extract the numeric value from the string
        const numericValue = parseInt(specialCase.match(/\d+/)?.[0] || '0', 10);
        return numericValue > 0 ? numericValue : quantity;
      }
      
      // For all other cases, calculate based on type
      if (type.toLowerCase().includes('19.4')) {
        // 19.4g preforms: 25kg / 19.4g = 1,288.66 pieces per bag
        const pieces = calculate19gPreformPieces(quantity);
        return Math.round(pieces);
      } else if (type.toLowerCase().includes('12.5')) {
        // 12.5g preforms: 25kg / 12.5g = 2,000 pieces per bag
        const pieces = calculate12gPreformPieces(quantity);
        return Math.round(pieces);
      } else if (type.toLowerCase().includes('10.5')) {
        // 10.5g preforms: 25kg / 10.5g = 2,381 pieces per bag
        const pieces = calculate10gPreformPieces(quantity);
        return Math.round(pieces);
      } else {
        // Standard calculation for other preforms - default to 2000 pieces per bag
        return quantity * 2000;
      }
    }
    
    // Non-preform materials
    switch(material) {
      case 'caps': {
        // Calculate pieces (assuming 8500 caps per box)
        const totalPcs = quantity * 8500;
        return Math.round(totalPcs);
      }
      case 'labels': {
        // Labels (capsleeves): 10 packs = 2000 pcs → 200 pcs per pack
        const pcsPerPack = 200;
        const totalPcs = quantity * pcsPerPack;
        return Math.round(totalPcs);
      }
      case 'ld shrink': {
        // LD Shrink: 10 rolls = 5600 cases → 560 cases per roll
        const casesPerRoll = 560;
        const totalCases = quantity * casesPerRoll;
        return Math.round(totalCases);
      }
      default:
        return quantity;
    }
  };

  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>(['all']);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // We're allowing all users to log damage
  useEffect(() => {
    // Set loading to false immediately
    setLoadingRoles(false);
    // Set a dummy value in allowedRoleIds that will pass permission checks
    setAllowedRoleIds(['all']);
  }, []);

  const handleDamageReport = (material: RawMaterial) => {
    // Allow all users to log damage
    setSelectedMaterial(material);
    setShowDamageModal(true);
  };

  const handleDamageSubmit = async (damagedAmount: number) => {
    try {
      if (!selectedMaterial) {
        throw new Error('No material selected');
      }

      const currentQuantity = selectedMaterial.available_quantity;
      const actualCount = selectedMaterial.actual_count || 0;

      // Calculate new quantities
      const newQuantity = currentQuantity - damagedAmount;
      const newActualCount = actualCount - damagedAmount;

      // Update raw materials table
      const { error: updateError } = await supabase
        .from('raw_materials')
        .update({
          available_quantity: newQuantity,
          actual_count: newActualCount,
          last_updated: new Date().toISOString()
        })
        .eq('id', selectedMaterial.id);

      if (updateError) {
        console.error('Error updating raw materials:', updateError);
        throw updateError;
      }

      // Add damage report to raw_material_transactions
      const { error: insertError } = await supabase
        .from('raw_material_transactions')
        .insert({
          material_id: selectedMaterial.id,
          type: 'damaged',
          quantity: damagedAmount,
          notes: `Damaged ${damagedAmount} pieces of ${selectedMaterial.material} (${selectedMaterial.type})`,
          transaction_date: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting damage report:', insertError);
        throw insertError;
      }

      // Refresh materials list and damage reports
      await fetchRawMaterials();
      await fetchDamageReports();

      // Close modal and reset selection
      setShowDamageModal(false);
      setSelectedMaterial(null);

      Alert.alert('Success', 'Damage report submitted successfully');
    } catch (error) {
      console.error('Error submitting damage report:', error);
      Alert.alert('Error', 'Failed to submit damage report. Please try again.');
    }
  };
  
  const handleReceiveMaterial = async () => {
    // Validate form inputs
    if (!newMaterialName || !newAmount || !newMaterialType) {
      setError('All fields (Material, Type, Amount) are required.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // Parse new amount as a number - this is the raw input value (bags, boxes, etc.)
      const newAmountValue = parseInt(newAmount, 10) || 0;
      
      // Convert amount based on unit type (e.g., bags to pieces for preforms)
      // This is the calculated count in pieces
      const actualCount = getUnitType(newMaterialName, newMaterialType, newAmountValue);
      
      // Find the material in the current state
      const existingMaterialIndex = rawMaterials.findIndex(m => m.material === newMaterialName && m.type === newMaterialType);
      
      let updatedMaterial: RawMaterial | null = null;
      
      if (existingMaterialIndex >= 0) {
        // Update existing material
        const existingMaterial = rawMaterials[existingMaterialIndex];
        
        // The new input value gets added to available_quantity (bags, boxes, etc.)
        const totalAvailableQuantity = existingMaterial.available_quantity + newAmountValue;
        
        // The calculated piece count gets added to actual_count
        const existingActualCount = existingMaterial.actual_count || 0;
        const totalActualCount = existingActualCount + actualCount;
        
        // Update in Supabase - available_quantity is the raw input (bags, boxes, etc.)
        const { data, error } = await supabase
          .from('raw_materials')
          .update({
            available_quantity: Math.round(totalAvailableQuantity),
            actual_count: Math.round(totalActualCount),
            last_updated: new Date().toISOString()
          })
          .eq('id', existingMaterial.id as any)
          .select();
          
        if (error) {
          console.error('❌ Supabase update error:', error);
          throw error;
        }
      } else {
        // Add new material to database
        // Insert into Supabase - available_quantity is the raw input (bags, boxes, etc.)
        const { data, error } = await supabase
          .from('raw_materials')
          .insert({
            material: newMaterialName,
            type: newMaterialType,
            available_quantity: Math.round(newAmountValue),
            actual_count: Math.round(actualCount),
            product_name: `${newMaterialName} ${newMaterialType}`,
            last_updated: new Date().toISOString()
          })
          .select();
          
        if (error) {
          console.error('❌ Supabase insert error:', error);
          throw error;
        }
      }
      
      // Refresh materials after update
      await fetchRawMaterials();
      
      // Reset form
      setNewMaterialName('');
      setNewMaterialType('');
      setNewAmount('');
      
      Alert.alert('Success', 'Material received successfully');
    } catch (error: any) {
      console.error('❌ Operation failed with error:', error);
      console.error('Error receiving material:', error);
      Alert.alert('Error', `Failed to receive material: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDamageReports = async () => {
    setIsLoadingDamageReports(true);
    try {
      const { data, error } = await supabase
        .from('raw_material_transactions')
        .select(`
          id,
          material_id,
          type,
          quantity,
          notes,
          transaction_date,
          raw_materials (
            material,
            type
          )
        `)
        .eq('type', 'damaged')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setDamageReports(data || []);
    } catch (error) {
      console.error('Error fetching damage reports:', error);
    } finally {
      setIsLoadingDamageReports(false);
    }
  };

  // Get unique material types and their subcategories for the filter dropdown
  const getMaterialCategories = () => {
    const categories: Record<string, Set<string>> = {};
    
    damageReports.forEach(report => {
      if (report.raw_materials?.material && report.raw_materials?.type) {
        const material = report.raw_materials.material;
        const type = report.raw_materials.type;
        
        if (!categories[material]) {
          categories[material] = new Set<string>();
        }
        categories[material].add(type);
      }
    });
    
    // Convert Sets to Arrays and sort
    const result: Record<string, string[]> = {};
    Object.keys(categories).sort().forEach(material => {
      result[material] = Array.from(categories[material]).sort();
    });
    
    return result;
  };

  // Filter damage reports based on selected material and type
  const getFilteredDamageReports = () => {
    let filtered = damageReports;
    
    if (selectedMaterialFilter) {
      filtered = filtered.filter(report => 
        report.raw_materials?.material === selectedMaterialFilter
      );
      
      if (selectedTypeFilter) {
        filtered = filtered.filter(report => 
          report.raw_materials?.type === selectedTypeFilter
        );
      }
    }
    
    return filtered;
  };

  // Calculate total damaged quantity for filtered reports
  const getTotalDamagedQuantity = () => {
    return getFilteredDamageReports().reduce((total, report) => total + report.quantity, 0);
  };

  // Get display text for the filter button
  const getFilterDisplayText = () => {
    if (!selectedMaterialFilter) {
      return 'All Materials';
    }
    
    if (selectedTypeFilter) {
      return `${selectedMaterialFilter} - ${selectedTypeFilter}`;
    }
    
    return selectedMaterialFilter;
  };

  // Handle pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchRawMaterials(),
      fetchDamageReports()
    ]);
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      <PageTitleBar title="Supplies" showBack={false} />
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{paddingBottom: 80}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10
        }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Raw Material Inventory</Text>
          
          {isLoadingData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2B7BB0" />
              <Text style={styles.loadingText}>Loading inventory...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={24} color="#f44336" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={fetchRawMaterials}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : rawMaterials.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No raw materials found</Text>
            </View>
          ) : (
            <View style={styles.scheduleTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.nameCell]}>Material</Text>
                <Text style={[styles.headerCell, styles.typeCell]}>Type</Text>
                <Text style={[styles.headerCell, styles.unitCell]}>Actual Count</Text>
                <Text style={[styles.headerCell, styles.actionCell]}>Damage</Text>
              </View>

              <View style={styles.tableBody}>
                {rawMaterials.map((material, index) => {
                  // All users can log damage, but admins can log anything
                  const { user } = useAuth();
                  const isAdmin = user?.isAdmin || false;
                  const canLogDamage = true; // Everyone can log damage
                  
                  return (
                    <View 
                      key={index}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 && styles.alternateRow,
                        material.low_stock && styles.lowStockRow
                      ]}
                    >
                      <Text style={[styles.cell, styles.nameCell]}>
                        {material.material}
                      </Text>
                      <Text style={[styles.cell, styles.typeCell]}>{material.type}</Text>
                      <Text style={[styles.cell, styles.unitCell]}>{material.actual_count !== undefined ? material.actual_count.toLocaleString() : getUnitType(material.material, material.type, material.available_quantity)}</Text>
                      <View style={[styles.cell, styles.actionCell]}>
                        <Pressable
                          style={[styles.deliverButton]}
                          onPress={() => handleDamageReport(material)}
                        >
                          <View style={styles.payButtonInner}>
                            <AlertTriangle size={14} color="#766b4f" style={styles.actionButtonIcon} />
                            <Text style={styles.payButtonText} numberOfLines={1}>
                              {isAdmin ? "LOG Damage (Admin)" : "LOG Damage"}
                            </Text>
                          </View>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderText, { flex: 1, textAlign: 'left' }]}>Receive New Material</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.formRow}>
              <View style={[styles.formField, { position: 'relative', zIndex: 1000 }]}>
                <Text style={styles.label}>Material Name</Text>
                <Pressable 
                  ref={materialButtonRef}
                  style={styles.select}
                  onPress={toggleMaterialDropdown}
                >
                  <Text style={styles.selectText}>
                    {newMaterialName || 'Select material'}
                  </Text>
                  <ChevronDown size={16} color="#666" />
                </Pressable>
                
                {showMaterialDropdown && (
                  <Modal
                    transparent={true}
                    visible={showMaterialDropdown}
                    animationType="none"
                    onRequestClose={() => setShowMaterialDropdown(false)}
                  >
                    <Pressable 
                      style={styles.modalOverlay}
                      onPress={() => setShowMaterialDropdown(false)}
                    >
                      <View>
                        <View style={[
                          styles.filterDropdown, 
                          {
                            position: 'absolute',
                            top: materialDropdownPosition.top,
                            left: materialDropdownPosition.left,
                            right: materialDropdownPosition.right,
                          }
                        ]}>
                          {uniqueMaterials.map((name, index) => (
                            <Pressable
                              key={index}
                              style={[
                                styles.filterDropdownItem,
                                newMaterialName === name && styles.selectedDropdownItem
                              ]}
                              onPress={() => {
                                setNewMaterialName(name);
                                setNewMaterialType('');
                                setShowMaterialDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.filterDropdownItemText,
                                newMaterialName === name && styles.selectedDropdownItemText
                              ]}>
                                {name}
                              </Text>
                            </Pressable>
                          ))}
                          <Pressable
                            style={styles.filterDropdownItem}
                            onPress={() => {
                              const customName = prompt('Enter new material name:');
                              if (customName) {
                                setNewMaterialName(customName);
                                setNewMaterialType('');
                              }
                              setShowMaterialDropdown(false);
                            }}
                          >
                            <Text style={[styles.filterDropdownItemText, { color: '#2B7BB0' }]}>
                              + Add New Material
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  </Modal>
                )}
              </View>

              <View style={[styles.formField, { position: 'relative', zIndex: 1000 }]}>
                <Text style={styles.label}>Material Type</Text>
                <Pressable 
                  ref={typeButtonRef}
                  style={[
                    styles.select,
                    !newMaterialName && styles.disabledSelect
                  ]}
                  onPress={toggleTypeDropdown}
                >
                  <Text 
                    style={[
                      styles.selectText,
                      !newMaterialName && styles.disabledText
                    ]}
                  >
                    {newMaterialType || 'Select type'}
                  </Text>
                  <ChevronDown size={16} color={newMaterialName ? "#666" : "#ccc"} />
                </Pressable>
                
                {showTypeDropdown && (
                  <Modal
                    transparent={true}
                    visible={showTypeDropdown}
                    animationType="none"
                    onRequestClose={() => setShowTypeDropdown(false)}
                  >
                    <Pressable 
                      style={styles.modalOverlay}
                      onPress={() => setShowTypeDropdown(false)}
                    >
                      <View>
                        <View style={[
                          styles.filterDropdown, 
                          {
                            position: 'absolute',
                            top: typeDropdownPosition.top,
                            left: typeDropdownPosition.left,
                            right: typeDropdownPosition.right,
                          }
                        ]}>
                          {materialTypes.map((type, index) => (
                            <Pressable
                              key={index}
                              style={[
                                styles.filterDropdownItem,
                                newMaterialType === type && styles.selectedDropdownItem
                              ]}
                              onPress={() => {
                                setNewMaterialType(type);
                                setShowTypeDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.filterDropdownItemText,
                                newMaterialType === type && styles.selectedDropdownItemText
                              ]}>
                                {type}
                              </Text>
                            </Pressable>
                          ))}
                          <Pressable
                            style={styles.filterDropdownItem}
                            onPress={() => {
                              const customType = prompt('Enter new type:');
                              if (customType) {
                                setNewMaterialType(customType);
                              }
                              setShowTypeDropdown(false);
                            }}
                          >
                            <Text style={[styles.filterDropdownItemText, { color: '#2B7BB0' }]}>
                              + Add New Type
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  </Modal>
                )}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>{getUnitLabel(newMaterialName)}</Text>
              <TextInput
                style={styles.input}
                placeholder={getPlaceholder(newMaterialName)}
                placeholderTextColor="#999"
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="numeric"
              />
            </View>

            <Pressable 
              style={({pressed}) => [
                styles.submitButton,
                loading && styles.disabledButton,
                pressed && styles.submitButtonPressed
              ]}
              onPress={handleReceiveMaterial}
              disabled={loading}
              android_ripple={{color: '#2e7d32'}}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Processing...' : 'Receive Material'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color="#fff" />
            <Text style={[styles.sectionHeaderText, { flex: 1, textAlign: 'left' }]}>Damaged Material Report</Text>
            
            <View style={styles.filterContainer}>
              <Pressable 
                ref={filterButtonRef}
                style={styles.filterButton}
                onPress={toggleFilterDropdown}
              >
                <Text style={styles.filterButtonText}>
                  {getFilterDisplayText()}
                </Text>
                <ChevronDown size={16} color="#666" />
              </Pressable>
              
              {showMaterialFilterDropdown && (
                <Modal
                  transparent={true}
                  visible={showMaterialFilterDropdown}
                  animationType="none"
                  onRequestClose={() => setShowMaterialFilterDropdown(false)}
                >
                  <Pressable 
                    style={styles.modalOverlay}
                    onPress={() => setShowMaterialFilterDropdown(false)}
                  >
                    <View>
                      <View style={[
                        styles.filterDropdown, 
                        {
                          position: 'absolute',
                          top: filterDropdownPosition.top,
                          left: filterDropdownPosition.left,
                          right: filterDropdownPosition.right,
                        }
                      ]}>
                        <Pressable
                          style={styles.filterDropdownItem}
                          onPress={() => {
                            setSelectedMaterialFilter(null);
                            setSelectedTypeFilter(null);
                            setShowMaterialFilterDropdown(false);
                          }}
                        >
                          <Text style={styles.filterDropdownItemText}>All Materials</Text>
                        </Pressable>
                        
                        {Object.entries(getMaterialCategories()).map(([material, types]) => (
                          <View key={material}>
                            <Pressable
                              style={[
                                styles.filterDropdownItem,
                                selectedMaterialFilter === material && !selectedTypeFilter && styles.selectedDropdownItem
                              ]}
                              onPress={() => {
                                if (selectedMaterialFilter === material) {
                                  setSelectedMaterialFilter(null);
                                  setSelectedTypeFilter(null);
                                } else {
                                  setSelectedMaterialFilter(material);
                                  setSelectedTypeFilter(null);
                                }
                                setShowMaterialFilterDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.filterDropdownItemText,
                                selectedMaterialFilter === material && !selectedTypeFilter && styles.selectedDropdownItemText
                              ]}>
                                {material}
                              </Text>
                              {types.length > 0 && (
                                <ChevronDown size={14} color={selectedMaterialFilter === material ? "#2B7BB0" : "#666"} />
                              )}
                            </Pressable>

                            {selectedMaterialFilter === material && types.map((type, i) => (
                              <Pressable
                                key={`${material}-${type}-${i}`}
                                style={[
                                  styles.filterDropdownSubItem,
                                  selectedTypeFilter === type && styles.selectedDropdownItem
                                ]}
                                onPress={() => {
                                  setSelectedTypeFilter(selectedTypeFilter === type ? null : type);
                                  setShowMaterialFilterDropdown(false);
                                }}
                              >
                                <Text style={[
                                  styles.filterDropdownSubItemText,
                                  selectedTypeFilter === type && styles.selectedDropdownItemText
                                ]}>
                                  {type}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ))}
                      </View>
                    </View>
                  </Pressable>
                </Modal>
              )}
            </View>
          </View>

          {isLoadingDamageReports ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2B7BB0" />
              <Text style={styles.loadingText}>Loading damage reports...</Text>
            </View>
          ) : getFilteredDamageReports().length === 0 ? (
            <View style={styles.noReports}>
              <Text style={styles.noReportsText}>
                {selectedMaterialFilter 
                  ? `No damage reports for ${getFilterDisplayText()}` 
                  : 'No damage reports yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.damageTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, { flex: 1.3, textAlign: 'left' }]}>Date</Text>
                <Text style={[styles.headerCell, { flex: 1.1, textAlign: 'left' }]}>Material</Text>
                <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'left' }]}>Type</Text>
                <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'right' }]}>Quantity</Text>
                <Text style={[styles.headerCell, { flex: 1.8, textAlign: 'left' }]}>Notes</Text>
              </View>

              {getFilteredDamageReports().map((report, index) => (
                <View 
                  key={report.id}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.alternateRow
                  ]}
                >
                  <Text style={[styles.cell, { flex: 1.2, textAlign: 'left' }]}>
                    {new Date(report.transaction_date).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.cell, { flex: 1.2, textAlign: 'left' }]}>
                    {report.raw_materials?.material}
                  </Text>
                  <Text style={[styles.cell, { flex: 1, textAlign: 'left' }]}>
                    {report.raw_materials?.type}
                  </Text>
                  <Text style={[styles.cell, { flex: 1, textAlign: 'right' }]}>
                    {report.quantity.toLocaleString()}
                  </Text>
                  <Text style={[styles.cell, { flex: 1.5, textAlign: 'left' }]}>
                    {report.notes}
                  </Text>
                </View>
              ))}
              
              {(selectedMaterialFilter || selectedTypeFilter) && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Damaged:</Text>
                  <Text style={styles.totalValue}>
                    {getTotalDamagedQuantity().toLocaleString()} pieces
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Note:</Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>
                • All damage is reported in pieces (pcs), not in bags/boxes/packs
              </Text>
              <Text style={styles.bulletPoint}>
                • The system automatically calculates how many containers are affected
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {selectedMaterial && (
        <DamageReportModal
          visible={showDamageModal}
          onClose={() => {
            setShowDamageModal(false);
            setSelectedMaterial(null);
          }}
          material={{
            name: selectedMaterial.material,
            type: selectedMaterial.type,
            amount: formatDisplayQuantity(selectedMaterial.material, selectedMaterial.type, selectedMaterial.available_quantity)
          }}
          onSubmit={handleDamageSubmit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fcfe',
    paddingBottom: 80,
  },
  content: {
    flex: 1,
    padding: 4,
  },
  section: {
    width: '100%',
    alignSelf: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
    marginBottom: 12,
    paddingLeft: 12,
    color: '#2B7BB0',
    paddingTop: 6,

  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    gap: 8,
    position: 'relative',
    zIndex: 1000,
  },
  sectionHeaderText: {
    color: '#2B7BB0',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 10,
    color: '#f44336',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#2B7BB0',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontFamily: 'AsapCondensed_400Regular',
  },
  scheduleTable: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginVertical: 10,
    borderWidth: 0,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#90A4AE',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1a6aa0',
  },
  headerCell: {
    fontWeight: '400',
    fontSize: 14,
    color: '#fff',
    paddingHorizontal: 12,
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 6,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  alternateRow: {
    backgroundColor: '#f8fafb',
  },
  cell: {
    fontSize: 14,
    fontWeight: '400',
    paddingHorizontal: 12,
    fontFamily: 'AsapCondensed_400Regular',
  },
  nameCell: {
    flex: 1.2,
    textAlign: 'left',
  },
  typeCell: {
    flex: 0.8, 
    textAlign: 'center',
  },
  unitCell: {
    flex: 1.6,
    textAlign: 'center',
  },
  actionCell: {
    flex: 2,
    alignItems: 'center',
  },
  actionsButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#7c74d2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  actionsButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  form: {
    padding: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formField: {
    flex: 1,
    position: 'relative',
    zIndex: 1000,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  selectText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  disabledSelect: {
    backgroundColor: '#f5f5f5',
    borderColor: '#eee',
  },
  disabledText: {
    color: '#999',
    fontFamily: 'AsapCondensed_400Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  dropdown: {
    position: 'absolute',
    top: 65,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    zIndex: 1000,
    elevation: 5,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    elevation: 2,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  submitButtonPressed: {
    backgroundColor: '#388E3C',
    elevation: 1,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    elevation: 0,
  },
  instruction: {
    padding: 16,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: 'AsapCondensed_400Regular',
  },
  noReports: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginHorizontal: 16,
    borderRadius: 6,
  },
  noReportsText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  noteBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2B7BB0',
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2B7BB0',
    fontFamily: 'AsapCondensed_400Regular',
  },
  bulletPoints: {
    gap: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: 'AsapCondensed_400Regular',
  },
  lowStockRow: {
    backgroundColor: '#fff8f8',
    borderLeftWidth: 3,
    borderLeftColor: '#ea474e',
  },
  damageTable: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 6,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterContainer: {
    position: 'relative',
    marginLeft: 'auto',
    zIndex: 1000,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
    fontFamily: 'AsapCondensed_400Regular',
  },
  filterDropdown: {
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
    maxHeight: 300,
    zIndex: 1000,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterDropdownSubItem: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterDropdownItemText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  filterDropdownSubItemText: {
    fontSize: 13,
    color: '#555',
    fontFamily: 'AsapCondensed_400Regular',
  },
  selectedDropdownItem: {
    backgroundColor: '#e6f2ff',
  },
  selectedDropdownItemText: {
    color: '#2B7BB0',
    fontWeight: '600',
  },
  subcategoryContainer: {
    backgroundColor: '#f9f9f9',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B7BB0',
    fontFamily: 'AsapCondensed_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  deliverButton: {
    backgroundColor: '#dcebc0', // Using the green from Deliver button in deliveries
    borderWidth: 2,            
    borderColor: '#feabb3', // Matching border color from deliveries
    borderRadius: 10,          
    flexDirection: 'row',   
    alignItems: 'center',   
    justifyContent: 'center',
  },
  payButtonInner: {
    borderWidth: 2,
    borderColor: '#ffffff', // White inner border
    borderRadius: 8,
    paddingHorizontal: 12, // Padding from deliveries inner style
    paddingVertical: 4, // Padding from deliveries inner style
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  payButtonText: {
    color: '#766b4f', // Text color from deliveries
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  actionButtonIcon: {
    marginRight: 4, // Icon style from deliveries
  },
  disabledLogButton: {
    backgroundColor: '#e0e0e0', // Grey background for disabled
    borderColor: '#bdbdbd',
    opacity: 0.7,
  },
  disabledLogButtonText: {
    color: '#9e9e9e', // Grey text color for disabled
  },
  tableBody: {
    // Add any necessary styles for the table body
  },
});