import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import { ChevronDown } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface MaterialPrice {
  material: string;
  type: string;
  price: number;
  unit: string;
}

interface CasePrice {
  size: string;
  case: number;
  material: number;
  totalCost: number;
}

interface Product {
  id: string;
  product_name: string;
  product_sn: string;
}

export default function CalculatorScreen() {
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [calculationResult, setCalculationResult] = useState<{
    totalPieces?: number;
    costPerPiece?: number;
    calculations?: string[];
    totalCost?: number;
  } | null>(null);
  
  // State for database data
  const [materialPrices, setMaterialPrices] = useState<MaterialPrice[]>([]);
  const [casePrices, setCasePrices] = useState<CasePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showPreformTypeDropdown, setShowPreformTypeDropdown] = useState(false);

  // Case calculator state
  const [selectedBottleSize, setSelectedBottleSize] = useState<string>('');
  const [selectedPreformType, setSelectedPreformType] = useState<string>('');
  const [casePriceResult, setCasePriceResult] = useState<{
    bottlesPerCase: number;
    totalCost: number;
    costPerBottle: number;
  } | null>(null);

  // Add state for shrink sleeve checkbox
  const [usesShrinkSleeves, setUsesShrinkSleeves] = useState(false);

  // Add state for bottles per case input
  const [bottlesPerCaseInput, setBottlesPerCaseInput] = useState<string>('');

  // Add new state and function for updating the cost per case
  const [updatingCostPerCase, setUpdatingCostPerCase] = useState(false);

  // Add a state variable for the specific case costs error
  const [caseCostsError, setCaseCostsError] = useState<string | null>(null);

  // Function to fetch the latest case costs data
  const fetchLatestCaseCosts = async () => {
    try {
      console.log('Fetching latest case costs data...');
      const { data, error } = await supabase
        .from('case_costs')
        .select('*')
        .order('size', { ascending: true });
        
      if (error) {
        console.error('Error fetching case costs:', error);
        return;
      }
      
      if (data) {
        console.log('Case costs data from DB:', data);
        
        // Map the database fields to the component's expected format
        const formattedCaseCosts = data.map(item => ({
          size: item.size,
          case: item.case_quantity,
          material: item.material_cost,
          totalCost: item.total_cost
        }));
        
        console.log('Formatted case costs data:', formattedCaseCosts);
        setCasePrices(formattedCaseCosts);
      }
    } catch (err: any) {
      console.error('Error in fetchLatestCaseCosts:', err);
    }
  };

  // Function to fetch material prices from the database
  const fetchMaterialPrices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get material prices
      const { data: priceData, error: priceError } = await supabase
        .from('material_prices')
        .select('material, type, price, unit')
        .order('material, type');

      if (priceError) {
        setError(`Error fetching material prices: ${priceError.message}`);
        setLoading(false);
        return;
      }

      if (priceData) {
        setMaterialPrices(priceData);
        console.log("Available materials:", [...new Set(priceData.map(item => item.material))]);
      }

      // Get products data
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, product_name, product_sn')
        .order('product_name', { ascending: true });
        
      if (productsError) {
        throw new Error(`Error fetching products: ${productsError.message}`);
      }
        
      setProducts(productsData || []);
      
      // Fetch case costs with the correct field mapping
      await fetchLatestCaseCosts();
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Use this function in useEffect to load data at startup
  useEffect(() => {
    fetchMaterialPrices();
  }, []);

  // Extract unique materials for dropdown
  const uniqueMaterials = [...new Set(materialPrices.map(item => item.material))];

  const getTypesForMaterial = (material: string) => {
    return materialPrices
      .filter(item => item.material === material)
      .map(item => item.type);
  };

  const calculateCost = () => {
    if (!selectedMaterial || !selectedType || !quantity || !invoiceAmount || !transportCost) {
      return;
    }

    try {
      console.log("Calculator input:", { 
        material: selectedMaterial, 
        type: selectedType,
        quantity: quantity,
        invoiceAmount: invoiceAmount,
        transportCost: transportCost 
      });
      
      const totalCost = parseFloat(invoiceAmount) + parseFloat(transportCost);
      const quantityNum = parseFloat(quantity);
      let costPerPiece = 0;
      let calculations: string[] = [];
      let totalPieces = quantityNum; // Default is to use the quantity as is

      // Special calculation for Preforms
      if (selectedMaterial === 'Preform') {
        console.log("Using Preform calculation");
        // For 12.5g preforms: 25kg per bag, calculate total pieces
        if (selectedType === '12.5g') {
          const gramsPerPiece = 12.5;
          const kgPerBag = 25;
          const piecesPerBag = (kgPerBag * 1000) / gramsPerPiece; // Convert kg to g and divide
          totalPieces = quantityNum * piecesPerBag; // Quantity is number of bags
          
          costPerPiece = totalCost / totalPieces;
          
          calculations = [
            `Total Cost = Invoice Amount + Transport Cost = ₹${parseFloat(invoiceAmount).toLocaleString()} + ₹${parseFloat(transportCost).toLocaleString()} = ₹${totalCost.toLocaleString()}`,
            `Pieces per bag = (25kg × 1000) ÷ 12.5g = ${piecesPerBag.toLocaleString()} preforms`,
            `Total preforms = ${quantityNum} bags × ${piecesPerBag.toLocaleString()} = ${totalPieces.toLocaleString()} preforms`,
            `Cost per preform = ₹${totalCost.toLocaleString()} ÷ ${totalPieces.toLocaleString()} = ₹${costPerPiece.toFixed(3)}`
          ];
        }
        // For 19.4g preforms
        else if (selectedType === '19.4g') {
          const gramsPerPiece = 19.4;
          const kgPerBag = 25;
          // Exact calculation: 25kg × 1000g/kg ÷ 19.4g = 1,288.66 pieces
          const piecesPerBag = (kgPerBag * 1000) / gramsPerPiece; // = 1,288.66 pieces
          totalPieces = quantityNum * piecesPerBag;
          
          costPerPiece = totalCost / totalPieces;
          
          calculations = [
            `Total Cost = Invoice Amount + Transport Cost = ₹${parseFloat(invoiceAmount).toLocaleString()} + ₹${parseFloat(transportCost).toLocaleString()} = ₹${totalCost.toLocaleString()}`,
            `Pieces per bag = (25kg × 1000) ÷ 19.4g = ${piecesPerBag.toFixed(2)} preforms`,
            `Total preforms = ${quantityNum} bags × ${piecesPerBag.toFixed(2)} = ${totalPieces.toFixed(2)} preforms`,
            `Cost per preform = ₹${totalCost.toLocaleString()} ÷ ${totalPieces.toFixed(2)} = ₹${costPerPiece.toFixed(3)}`
          ];
        }
      }
      // Special calculation for Caps - check different variations of cap names
      else if (selectedMaterial.toLowerCase().includes('cap')) {
        console.log("Using Cap calculation with 8500 pieces per box");
        const piecesPerBox = 8500; // Each box has 8500 pieces
        totalPieces = quantityNum * piecesPerBox; // Quantity is number of boxes
        
        costPerPiece = totalCost / totalPieces;
        
        calculations = [
          `Total Cost = Invoice Amount + Transport Cost = ₹${parseFloat(invoiceAmount).toLocaleString()} + ₹${parseFloat(transportCost).toLocaleString()} = ₹${totalCost.toLocaleString()}`,
          `Pieces per box = 8,500 caps`,
          `Total caps = ${quantityNum} boxes × 8,500 = ${totalPieces.toLocaleString()} caps`,
          `Cost per cap = ₹${totalCost.toLocaleString()} ÷ ${totalPieces.toLocaleString()} = ₹${costPerPiece.toFixed(3)}`
        ];
      }
      // Special calculation for LD Shrink
      else if (selectedMaterial === 'LD Shrink') {
        console.log("Using LD Shrink calculation with 50g per case");
        const gramsPerCase = 50; // Each case uses 50g of LD Shrink
        const totalGrams = quantityNum * 1000; // Convert KGs to grams
        const numberOfCases = totalGrams / gramsPerCase;
        
        costPerPiece = totalCost / numberOfCases; // Cost per case
        
        calculations = [
          `Total Cost = Invoice Amount + Transport Cost = ₹${parseFloat(invoiceAmount).toLocaleString()} + ₹${parseFloat(transportCost).toLocaleString()} = ₹${totalCost.toLocaleString()}`,
          `Total weight = ${quantityNum} KGs × 1000 = ${totalGrams.toLocaleString()} grams`,
          `Number of cases = ${totalGrams.toLocaleString()} grams ÷ 50g per case = ${numberOfCases.toLocaleString()} cases`,
          `Cost per case = ₹${totalCost.toLocaleString()} ÷ ${numberOfCases.toLocaleString()} = ₹${costPerPiece.toFixed(3)}`
        ];
        
        // Update the totalPieces to represent cases for LD Shrink
        totalPieces = numberOfCases;
      }
      // Default calculation for other materials
      else {
        console.log("Using default calculation");
        totalPieces = quantityNum; // Use quantity as is
        costPerPiece = totalCost / totalPieces;
        
        calculations = [
          `Total Cost = Invoice Amount + Transport Cost = ₹${parseFloat(invoiceAmount).toLocaleString()} + ₹${parseFloat(transportCost).toLocaleString()} = ₹${totalCost.toLocaleString()}`,
          `Cost per Piece = Total Cost ÷ Quantity = ₹${totalCost.toLocaleString()} ÷ ${quantityNum.toLocaleString()} = ₹${costPerPiece.toFixed(3)}`,
        ];
      }
      
      // Set the result with final calculations
      setCalculationResult({
        totalPieces,
        costPerPiece,
        calculations,
        totalCost
      });
    } catch (err) {
      console.error('Error calculating cost:', err);
    }
  };

  const updatePriceInDb = async () => {
    console.log('updatePriceInDb function called');
    if (!calculationResult || !selectedMaterial || !selectedType) {
      console.log('Missing data', { calculationResult, selectedMaterial, selectedType });
      Alert.alert('Error', 'Calculation result is required to update the database.');
      return;
    }

    try {
      // Show an alert to indicate the process has started
      Alert.alert('Processing', 'Attempting to update price in database...');
      
      console.log('Finding material info for', selectedMaterial, selectedType);
      
      // Find the appropriate unit for the material
      const materialInfo = materialPrices.find(
        item => item.material === selectedMaterial && item.type === selectedType
      );
      
      if (!materialInfo) {
        console.error('Material info not found');
        Alert.alert('Error', 'Material information not found in the database.');
        return;
      }
      
      console.log('Found material info:', materialInfo);
      
      // Ensure the price is a valid number
      if (!calculationResult.costPerPiece || isNaN(calculationResult.costPerPiece)) {
        console.error('Invalid price value:', calculationResult.costPerPiece);
        Alert.alert('Error', 'The calculated price is not a valid number');
        return;
      }
      
      console.log('Will update price to:', calculationResult.costPerPiece);
      
      // Create data object for update
      const updateData = {
        material: selectedMaterial,
        type: selectedType,
        unit: materialInfo.unit,
        price: Number(calculationResult.costPerPiece), // Ensure it's a number
        last_updated: new Date().toISOString(),
        notes: `Updated via Price Calculator. Invoice: ${parseFloat(invoiceAmount)}, Transport: ${parseFloat(transportCost)}`
      };
      
      console.log('Updating database with:', updateData);
      
      // Use explicit insert attempt first
      const { data: insertData, error: insertError } = await supabase
        .from('material_prices')
        .insert(updateData);
        
      console.log('Insert attempt result:', { data: insertData, error: insertError });
        
      // If insert fails with 23505 (unique violation), try update instead
      if (insertError && insertError.code === '23505') {
        console.log('Insert failed with unique violation, trying update instead');
        
        const { data: updateResult, error: updateError } = await supabase
          .from('material_prices')
          .update({ price: Number(calculationResult.costPerPiece), last_updated: new Date().toISOString() })
          .eq('material', selectedMaterial)
          .eq('type', selectedType);
          
        console.log('Update result:', { data: updateResult, error: updateError });
        
        if (updateError) {
          console.error('Error updating price:', updateError);
          Alert.alert('Update Failed', `Could not update the price: ${updateError.message}`);
          return;
        }
        
        // Update successful
        Alert.alert('Success', `Price for ${selectedMaterial} (${selectedType}) updated successfully.`);
      } 
      // If insert was successful or failed with a different error
      else {
        if (insertError) {
          console.error('Error inserting price:', insertError);
          Alert.alert('Update Failed', `Could not insert the price: ${insertError.message}`);
          return;
        }
        
        // Insert successful
        Alert.alert('Success', `Price for ${selectedMaterial} (${selectedType}) added successfully.`);
      }
      
      // Refresh material prices after update
      console.log('Refreshing material prices data');
      await fetchMaterialPrices();
      
    } catch (err) {
      console.error('Error in updatePriceInDb:', err);
      Alert.alert('Error', `An unexpected error occurred while updating the price: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Function to calculate case price
  const calculateCasePrice = () => {
    if (!selectedBottleSize || !selectedPreformType || !bottlesPerCaseInput) {
      Alert.alert('Error', 'Please enter the number of bottles per case');
      return;
    }
    
    try {
      // Only use manual input for bottles per case
      const bottlesPerCase = parseInt(bottlesPerCaseInput);
      
      if (isNaN(bottlesPerCase) || bottlesPerCase <= 0) {
        Alert.alert('Error', 'Please enter a valid number for bottles per case');
        return;
      }
      
      // Find material prices for the selected components
      const preformPrice = materialPrices.find(
        item => item.material === 'Preform' && item.type === selectedPreformType
      );
      
      // Get the proper label based on the selected product
      let labelType = 'Standard'; // Default label type
      const selectedProduct = products.find(p => p.product_name === selectedBottleSize);
      if (selectedProduct) {
        // Try to determine label type from product name
        if (selectedProduct.product_name.includes('250ml')) {
          labelType = '250ml';
        } else if (selectedProduct.product_name.includes('500ml')) {
          labelType = '500ml';
        } else if (selectedProduct.product_name.includes('1000ml') || selectedProduct.product_name.includes('1L')) {
          labelType = '1000ml';
        }
      }
      
      // Get label price based on determined type if possible
      const labelPrice = materialPrices.find(
        item => item.material === 'Label' && (item.type === labelType || item.type === 'Standard')
      ) || materialPrices.find(item => item.material === 'Label');
      
      const capPrice = materialPrices.find(
        item => item.material === 'Cap'
      );
      
      const shrinkSleevePrice = materialPrices.find(
        item => item.material === 'Shrink Sleeve'
      );
      
      const ldShrinkPrice = materialPrices.find(
        item => item.material === 'LD Shrink'
      );
      
      if (!preformPrice) {
        Alert.alert('Error', `Price for ${selectedPreformType} preform not found`);
        return;
      }
      
      // Calculate costs using prices from the database
      const preformCostNum = preformPrice.price || 0;
      const labelCostNum = labelPrice?.price || 0;
      const capCostNum = capPrice?.price || 0;
      const shrinkSleeveCostNum = usesShrinkSleeves ? (shrinkSleevePrice?.price || 0) : 0;
      
      // LD Shrink is counted as 1 per case, not per bottle
      const ldShrinkCostNum = ldShrinkPrice?.price || 0;
      
      // Individual components cost per bottle
      const bottleCost = preformCostNum + labelCostNum + capCostNum + 
                       (usesShrinkSleeves ? shrinkSleeveCostNum : 0);
                       
      // Total cost is (components × number of bottles) + one LD shrink per case
      const totalMaterialCost = (bottleCost * bottlesPerCase) + ldShrinkCostNum;
      
      const costPerBottle = totalMaterialCost / bottlesPerCase;
      
      setCasePriceResult({
        bottlesPerCase,
        totalCost: totalMaterialCost,
        costPerBottle
      });
    } catch (err) {
      console.error('Error calculating case price:', err);
      Alert.alert('Error', 'Could not calculate case price');
    }
  };

  // Call fetchLatestCaseCosts after successfully updating the case costs
  const updateCostPerCase = async () => {
    if (!casePriceResult || !selectedBottleSize || !selectedPreformType) {
      return;
    }
    
    try {
      setUpdatingCostPerCase(true);
      setCaseCostsError(null);
      
      // Find the preform price from material_prices table
      const preformPrice = materialPrices.find(
        item => item.material === 'Preform' && item.type === selectedPreformType
      );
      
      if (!preformPrice) {
        Alert.alert('Error', `Price for ${selectedPreformType} preform not found`);
        return;
      }
      
      // Extract a valid size from the product name (must be exactly '250ml', '500ml', or '1000ml')
      let validSize = '';
      if (selectedBottleSize.includes('250ml')) {
        validSize = '250ml';
      } else if (selectedBottleSize.includes('500ml')) {
        validSize = '500ml';
      } else if (selectedBottleSize.includes('1000ml') || selectedBottleSize.includes('1L')) {
        validSize = '1000ml';
      } else {
        // If we can't determine size, use 500ml as default
        validSize = '500ml';
      }
      
      // Attempt the simplest possible insert with all required fields
      const result = await supabase
        .from('case_costs')
        .insert({
          size: validSize, // Use the standardized size value
          case_quantity: casePriceResult.bottlesPerCase,
          material_cost: preformPrice.price, // Use the preform price directly from the table
          total_cost: casePriceResult.totalCost
        });
      
      if (result.error) {
        console.error('Specific error:', result.error);
        setCaseCostsError(`Error: ${result.error.message} (Code: ${result.error.code})`);
        Alert.alert('Error', `Failed to update: ${result.error.message}`);
      } else {
        // Successfully updated, now refresh the data
        await fetchLatestCaseCosts();
        Alert.alert('Success', 'Case cost updated successfully and table refreshed');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setCaseCostsError(`Exception: ${err.message}`);
      Alert.alert('Error', `Something went wrong: ${err.message}`);
    } finally {
      setUpdatingCostPerCase(false);
    }
  };

  // Function to test database connection and permissions
  const testDatabaseAccess = async () => {
    try {
      // Try to read from the table first to verify access
      const { data: readData, error: readError } = await supabase
        .from('case_costs')
        .select('*')
        .limit(1);
        
      if (readError) {
        console.error('Read error:', readError);
        Alert.alert('Read Error', `Can't read from case_costs: ${readError.message}`);
        return;
      }
      
      console.log('Successfully read from case_costs:', readData);
      
      // Try an insert with explicit data
      const insertData = {
        size: '500ml Test',
        case_quantity: 24,
        material_cost: 1.5,
        total_cost: 36.0
      };
      
      console.log('Attempting to insert:', insertData);
      
      const { data: insertData1, error: insertError1 } = await supabase
        .from('case_costs')
        .insert(insertData)
        .select();
        
      if (insertError1) {
        console.error('Insert error:', insertError1);
        
        // If the error is about duplicate values, try with a unique name
        const uniqueData = {
          ...insertData,
          size: `500ml Test ${new Date().getTime()}`
        };
        
        console.log('Trying with unique data:', uniqueData);
        
        const { data: insertData2, error: insertError2 } = await supabase
          .from('case_costs')
          .insert(uniqueData)
          .select();
          
        if (insertError2) {
          console.error('Second insert error:', insertError2);
          Alert.alert('Insert Error', `Can't insert into case_costs: ${insertError2.message}`);
        } else {
          console.log('Insert succeeded with unique data:', insertData2);
          Alert.alert('Success', 'Test insert succeeded with unique data!');
        }
      } else {
        console.log('Insert succeeded:', insertData1);
        Alert.alert('Success', 'Test insert succeeded!');
      }
    } catch (err: any) {
      console.error('Test failed:', err);
      Alert.alert('Test Failed', `Error: ${err.message}`);
    }
  };

  // Add a special debug function to examine the material_prices table structure
  const debugMaterialPricesTable = async () => {
    console.log('Examining material_prices table structure...');
    
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('debug_table_info', { table_name: 'material_prices' });
        
      if (tableError) {
        console.error('Error getting table info:', tableError);
      } else {
        console.log('Table structure:', tableInfo);
      }
      
      // Get a single row to examine
      const { data: sampleRow, error: rowError } = await supabase
        .from('material_prices')
        .select('*')
        .limit(1);
        
      if (rowError) {
        console.error('Error getting sample row:', rowError);
      } else {
        console.log('Sample row from material_prices:', sampleRow);
      }
    } catch (err) {
      console.error('Debug error:', err);
    }
  };

  // If loading, show loading spinner
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2B7BB0" />
        <Text style={styles.loadingText}>Loading material prices...</Text>
      </View>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => {
      setShowMaterialDropdown(false);
      setShowTypeDropdown(false);
      setShowProductDropdown(false);
      setShowPreformTypeDropdown(false);
    }}>
      <View style={styles.container}>
        <PageTitleBar title="Material Price Calculator" showBack={false} />
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          scrollEnabled={!showMaterialDropdown && !showTypeDropdown && !showProductDropdown && !showPreformTypeDropdown}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Material Price Calculator</Text>

            <View style={styles.table}>
              <Text style={styles.calculatorTitle}>Current Price - {new Date().toLocaleDateString()}</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.materialCell]}>Material</Text>
                <Text style={[styles.headerCell, styles.typeCell]}>Type</Text>
                <Text style={[styles.headerCell, styles.priceCell]}>Price</Text>
                <Text style={[styles.headerCell, styles.unitCell]}>Unit</Text>
              </View>

              {materialPrices.length > 0 ? (
                materialPrices.map((item, index) => {
                  // Determine if this price is too low (for visual highlighting)
                  const isLowPrice = item.price < 0.5;
                  
                  return (
                    <View 
                      key={index}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 && styles.alternateRow,
                        isLowPrice && styles.lowStockRow
                      ]}
                    >
                      <Text style={[styles.cell, styles.materialCell]}>{item.material}</Text>
                      <Text style={[styles.cell, styles.typeCell]}>{item.type}</Text>
                      <Text style={[styles.cell, styles.priceCell]}>₹{item.price.toFixed(2)}</Text>
                      <Text style={[styles.cell, styles.unitCell]}>{item.unit}</Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No material prices available</Text>
                </View>
              )}
            </View>

            <View style={[styles.calculatorContainer, { marginTop: 20 }]}>
              <View>
                <Text style={styles.calculatorTitle}>Calculate New Price</Text>
                
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Material</Text>
                    <Pressable
                      style={styles.dropdown}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowMaterialDropdown(!showMaterialDropdown);
                        setShowTypeDropdown(false);
                        setShowProductDropdown(false);
                        setShowPreformTypeDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>
                        {selectedMaterial || 'Select Material'}
                      </Text>
                      <ChevronDown size={20} color="#666" />
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
                              styles.modalDropdownList, 
                              {
                                position: 'absolute',
                                top: 170, // Adjust this value based on the position needed
                                left: 16,
                                right: 16,
                                width: undefined,
                              }
                            ]}>
                              {uniqueMaterials.map((material, index) => (
                                <Pressable
                                  key={index}
                                  style={[
                                    styles.dropdownItem,
                                    material === selectedMaterial && styles.activeDropdownItem
                                  ]}
                                  onPress={() => {
                                    setSelectedMaterial(material);
                                    setSelectedType('');
                                    setShowMaterialDropdown(false);
                                  }}
                                >
                                  <Text style={styles.dropdownItemText}>{material}</Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        </Pressable>
                      </Modal>
                    )}
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Type</Text>
                    <Pressable
                      style={[styles.dropdown, {opacity: selectedMaterial ? 1 : 0.5}]}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (selectedMaterial) {
                          setShowTypeDropdown(!showTypeDropdown);
                          setShowMaterialDropdown(false);
                          setShowProductDropdown(false);
                          setShowPreformTypeDropdown(false);
                        }
                      }}
                      disabled={!selectedMaterial}
                    >
                      <Text style={styles.dropdownText}>
                        {selectedType || 'Select Type'}
                      </Text>
                      <ChevronDown size={20} color="#666" />
                    </Pressable>
                    
                    {showTypeDropdown && selectedMaterial && (
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
                              styles.modalDropdownList, 
                              {
                                position: 'absolute',
                                top: 170, // Adjust this value based on the position needed
                                left: 16,
                                right: 16,
                                width: undefined,
                              }
                            ]}>
                              {getTypesForMaterial(selectedMaterial).map((type, index) => (
                                <Pressable
                                  key={index}
                                  style={[
                                    styles.dropdownItem,
                                    type === selectedType && styles.activeDropdownItem
                                  ]}
                                  onPress={() => {
                                    setSelectedType(type);
                                    setShowTypeDropdown(false);
                                  }}
                                >
                                  <Text style={styles.dropdownItemText}>{type}</Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        </Pressable>
                      </Modal>
                    )}
                  </View>
                </View>
                
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>
                      {selectedMaterial === 'LD Shrink' ? 'Quantity (KGs)' : 'Quantity'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={quantity}
                      onChangeText={setQuantity}
                      placeholder={selectedMaterial === 'LD Shrink' ? "Enter KGs" : "Enter quantity"}
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Invoice Amount</Text>
                    <TextInput
                      style={styles.input}
                      value={invoiceAmount}
                      onChangeText={setInvoiceAmount}
                      placeholder="Enter invoice amount"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
                
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Transport Cost</Text>
                    <TextInput
                      style={styles.input}
                      value={transportCost}
                      onChangeText={setTransportCost}
                      placeholder="Enter transport cost"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
                
                <Pressable
                  style={[
                    styles.calculateButton,
                    (!selectedMaterial || !selectedType || !quantity || !invoiceAmount) && styles.calculateButtonDisabled
                  ]}
                  onPress={calculateCost}
                  disabled={!selectedMaterial || !selectedType || !quantity || !invoiceAmount}
                >
                  <Text style={styles.calculateButtonText}>Calculate Price</Text>
                </Pressable>
                
                {calculationResult && (
                  <View style={styles.resultContainer}>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>
                        {selectedMaterial === 'LD Shrink' ? 'Total cases:' : 'Total pieces:'}
                      </Text>
                      <Text style={styles.resultValue}>{calculationResult.totalPieces}</Text>
                    </View>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>
                        {selectedMaterial === 'LD Shrink' ? 'Cost per case:' : 'Cost per piece:'}
                      </Text>
                      <Text style={styles.resultValue}>₹{calculationResult.costPerPiece?.toFixed(4)}</Text>
                    </View>
                    {calculationResult.calculations?.map((calc, index) => (
                      <View key={index} style={styles.resultItem}>
                        <Text style={styles.resultLabel}>Calculation {index + 1}:</Text>
                        <Text style={styles.resultValue}>{calc}</Text>
                      </View>
                    ))}
                    {calculationResult.totalCost !== undefined && (
                      <View style={styles.resultItem}>
                        <Text style={styles.resultLabel}>Total cost:</Text>
                        <Text style={styles.resultValue}>₹{calculationResult.totalCost.toFixed(2)}</Text>
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={{
                        backgroundColor: calculationResult?.costPerPiece ? '#1e88e5' : '#cccccc',
                        padding: 15,
                        borderRadius: 8,
                        alignItems: 'center',
                        marginTop: 10,
                        elevation: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        opacity: calculationResult?.costPerPiece ? 1 : 0.5
                      }}
                      onPress={() => {
                        console.log('Standalone update button pressed');
                        
                        if (!calculationResult || !selectedMaterial || !selectedType) {
                          Alert.alert('Error', 'Please complete the calculation first');
                          return;
                        }
                        
                        const price = calculationResult.costPerPiece;
                        
                        // Extract the base material type (e.g., "Caps" from "Caps (28mm)")
                        let baseMaterial = selectedMaterial;
                        let actualType = selectedType;
                        
                        // If the material contains parentheses, it might be a composite name
                        if (selectedMaterial.includes('(')) {
                          const parts = selectedMaterial.split('(');
                          baseMaterial = parts[0].trim();
                          
                          // If no type is selected, use what's in parentheses as the type
                          if (!selectedType || selectedType === '') {
                            actualType = parts[1].replace(')', '').trim();
                          }
                        }
                        
                        console.log(`Updating ${baseMaterial} (${actualType}) to price: ${price}`);
                        
                        // Find the material info
                        const materialInfo = materialPrices.find(
                          item => item.material.toLowerCase() === baseMaterial.toLowerCase() && 
                                 item.type.toLowerCase() === actualType.toLowerCase()
                        );
                        
                        if (!materialInfo) {
                          console.error('Material not found:', {
                            searchedMaterial: baseMaterial,
                            searchedType: actualType,
                            availableMaterials: materialPrices.map(m => `${m.material}:${m.type}`)
                          });
                          
                          Alert.alert(
                            'Material Not Found', 
                            `Could not find ${baseMaterial} (${actualType}) in the database. Would you like to examine the table structure?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Examine Table', 
                                onPress: () => debugMaterialPricesTable()
                              },
                              {
                                text: 'Try Direct Update',
                                onPress: () => {
                                  // Try a direct update without finding the material first
                                  supabase
                                    .from('material_prices')
                                    .update({ 
                                      price: price,
                                      last_updated: new Date().toISOString()
                                    })
                                    .eq('material', baseMaterial)
                                    .eq('type', actualType)
                                    .then(({ data, error }) => {
                                      if (error) {
                                        console.error('Direct update error:', error);
                                        Alert.alert('Error', `Direct update failed: ${error.message}`);
                                      } else {
                                        console.log('Direct update response:', data);
                                        Alert.alert('Success', `Directly updated ${baseMaterial} (${actualType}) price to ₹${price?.toFixed(4)}`);
                                        fetchMaterialPrices();
                                      }
                                    });
                                }
                              }
                            ]
                          );
                          return;
                        }
                        
                        // Full update with all required fields
                        const updateData = {
                          price: price,
                          last_updated: new Date().toISOString(),
                          notes: `Updated via Price Calculator: Invoice ₹${invoiceAmount}, Transport ₹${transportCost}`
                        };
                        
                        console.log('Found material info:', materialInfo);
                        console.log('Update data:', updateData);
                        
                        // Direct database call with proper update data
                        supabase
                          .from('material_prices')
                          .update(updateData)
                          .eq('material', materialInfo.material) // Use the exact material from the found record
                          .eq('type', materialInfo.type) // Use the exact type from the found record
                          .then(({ data, error }) => {
                            if (error) {
                              console.error('DB update error:', error);
                              Alert.alert('Error', `Failed to update: ${error.message}`);
                            } else {
                              console.log('Update response:', data);
                              Alert.alert('Success', `Updated ${materialInfo.material} (${materialInfo.type}) price to ₹${price?.toFixed(4)}`);
                              
                              // After update, explicitly refresh the data
                              setTimeout(() => {
                                fetchMaterialPrices(); 
                              }, 500);
                            }
                          });
                      }}
                      disabled={!calculationResult?.costPerPiece}
                    >
                      <Text style={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        fontSize: 18 
                      }}>
                        SAVE PRICE TO DATABASE
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cost per Case</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.sizeCell]}>Size</Text>
                <Text style={[styles.headerCell, styles.caseCell]}>Bottles/Case</Text>
                <Text style={[styles.headerCell, styles.materialCostCell]}>Cost/Bottle</Text>
                <Text style={[styles.headerCell, styles.totalCostCell]}>Cost/Case</Text>
              </View>

              {casePrices.map((item, index) => (
                <View 
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.alternateRow
                  ]}
                >
                  <Text style={[styles.cell, styles.sizeCell]}>{item.size}</Text>
                  <Text style={[styles.cell, styles.caseCell]}>{item.case}</Text>
                  <Text style={[styles.cell, styles.materialCostCell]}>₹{item.material.toFixed(2)}</Text>
                  <Text style={[styles.cell, styles.totalCostCell]}>₹{item.totalCost.toFixed(2)}</Text>
                </View>
              ))}
            </View>
            
            {/* Add spacing between the table and Case Cost Calculator */}
            <View style={{ marginTop: 30 }} />
            
            <View style={styles.caseCalculatorContainer}>
              <Text style={styles.caseCalculatorTitle}>Case Cost Calculator</Text>
              
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Bottle Size</Text>
                  <Pressable
                    style={styles.dropdown}
                    onPress={() => {
                      // Close other dropdowns
                      setShowMaterialDropdown(false);
                      setShowTypeDropdown(false);
                      setShowPreformTypeDropdown(false);
                      // Toggle this dropdown
                      setShowProductDropdown(!showProductDropdown);
                    }}
                  >
                    <Text style={styles.dropdownText}>
                      {selectedBottleSize || 'Select product'}
                    </Text>
                    <ChevronDown size={20} color="#666" />
                  </Pressable>
                  {showProductDropdown && (
                    <Modal
                      transparent={true}
                      visible={showProductDropdown}
                      animationType="none"
                      onRequestClose={() => setShowProductDropdown(false)}
                    >
                      <Pressable 
                        style={styles.modalOverlay}
                        onPress={() => setShowProductDropdown(false)}
                      >
                        <View>
                          <View style={[
                            styles.modalDropdownList, 
                            {
                              position: 'absolute',
                              top: 170, // Adjust this value based on the position needed
                              left: 16,
                              right: 16,
                              width: undefined,
                            }
                          ]}>
                            {products.length > 0 ? (
                              products.map((product, index) => (
                                <Pressable
                                  key={index}
                                  style={styles.dropdownItem}
                                  onPress={() => {
                                    setSelectedBottleSize(product.product_name);
                                    setShowProductDropdown(false);
                                  }}
                                >
                                  <Text style={styles.dropdownItemText}>
                                    {product.product_name} ({product.product_sn})
                                  </Text>
                                </Pressable>
                              ))
                            ) : (
                              <View style={styles.dropdownItem}>
                                <Text style={styles.dropdownItemText}>No products available</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    </Modal>
                  )}
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.label}>Preform Type</Text>
                  <Pressable
                    style={styles.dropdown}
                    onPress={() => {
                      // Close other dropdowns
                      setShowMaterialDropdown(false);
                      setShowTypeDropdown(false);
                      setShowProductDropdown(false);
                      // Toggle this dropdown
                      setShowPreformTypeDropdown(!showPreformTypeDropdown);
                    }}
                  >
                    <Text style={styles.dropdownText}>
                      {selectedPreformType || 'Select preform'}
                    </Text>
                    <ChevronDown size={20} color="#666" />
                  </Pressable>
                  {showPreformTypeDropdown && (
                    <Modal
                      transparent={true}
                      visible={showPreformTypeDropdown}
                      animationType="none"
                      onRequestClose={() => setShowPreformTypeDropdown(false)}
                    >
                      <Pressable 
                        style={styles.modalOverlay}
                        onPress={() => setShowPreformTypeDropdown(false)}
                      >
                        <View>
                          <View style={[
                            styles.modalDropdownList, 
                            {
                              position: 'absolute',
                              top: 170, // Adjust this value based on the position needed
                              left: 16,
                              right: 16,
                              width: undefined,
                            }
                          ]}>
                            <Pressable
                              style={styles.dropdownItem}
                              onPress={() => {
                                setSelectedPreformType('12.5g');
                                setShowPreformTypeDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>12.5g Preform</Text>
                            </Pressable>
                            <Pressable
                              style={styles.dropdownItem}
                              onPress={() => {
                                setSelectedPreformType('19.4g');
                                setShowPreformTypeDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>19.4g Preform</Text>
                            </Pressable>
                          </View>
                        </View>
                      </Pressable>
                    </Modal>
                  )}
                </View>
              </View>
              
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>No. of Bottles per Case</Text>
                  <TextInput
                    style={styles.input}
                    value={bottlesPerCaseInput}
                    onChangeText={(text) => {
                      // Only accept up to 2 digits
                      if (/^\d{0,2}$/.test(text)) {
                        setBottlesPerCaseInput(text);
                      }
                    }}
                    placeholder="Enter number"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                    maxLength={2}
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.label}></Text>
                  <View style={[styles.checkboxContainer, styles.checkboxWithPadding]}>
                    <Pressable
                      style={styles.checkbox}
                      onPress={() => setUsesShrinkSleeves(!usesShrinkSleeves)}
                    >
                      {usesShrinkSleeves && <View style={styles.checkboxInner} />}
                    </Pressable>
                    <Text style={styles.checkboxLabel}>Does it use shrink sleeves?</Text>
                  </View>
                </View>
              </View>
              
              <Pressable
                style={[
                  styles.calculateButton,
                  (!selectedBottleSize || !selectedPreformType) && styles.calculateButtonDisabled
                ]}
                onPress={calculateCasePrice}
                disabled={!selectedBottleSize || !selectedPreformType}
              >
                <Text style={styles.calculateButtonText}>Calculate Case Cost</Text>
              </Pressable>
              
              {casePriceResult && (
                <View style={styles.caseResultContainer}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Number of bottles per case:</Text>
                    <Text style={styles.resultValue}>{casePriceResult.bottlesPerCase}</Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Total material cost per case:</Text>
                    <Text style={styles.resultValue}>₹{casePriceResult.totalCost.toFixed(2)}</Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Material cost per bottle:</Text>
                    <Text style={styles.resultValue}>₹{casePriceResult.costPerBottle.toFixed(2)}</Text>
                  </View>
                  
                  <Pressable
                    style={[styles.updateCostButton, updatingCostPerCase && styles.buttonDisabled]}
                    onPress={updateCostPerCase}
                    disabled={updatingCostPerCase}
                  >
                    <Text style={styles.updateCostButtonText}>
                      {updatingCostPerCase ? 'Updating...' : 'Update Cost per Case'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
          
          {caseCostsError && (
            <View style={styles.errorMessageContainer}>
              <Text style={styles.errorMessageText}>{caseCostsError}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingBottom: 80,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'AsapCondensed_400Regular',
  },
  retryButton: {
    backgroundColor: '#2B7BB0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 8,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#2B7BB0',
    marginBottom: 16,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  table: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
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
    color: '#353535',
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  alternateRow: {
    backgroundColor: '#f8fff8',
  },
  lowStockRow: {
    backgroundColor: '#fff0f0',
  },
  cell: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  materialCell: {
    flex: 1,
  },
  typeCell: {
    flex: 2,
  },
  priceCell: {
    flex: 1,
  },
  unitCell: {
    flex: 1,
  },
  sizeCell: {
    flex: 1,
  },
  caseCell: {
    flex: 1,
  },
  materialCostCell: {
    flex: 1,
  },
  totalCostCell: {
    flex: 1,
  },
  calculatorContainer: {
    padding: 15,
    backgroundColor: '#fdfceb',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
    position: 'relative',
    zIndex: 100,
    borderWidth: 1,
    borderColor: '#e6e3c4',
  },
  calculatorTitle: {
    fontSize: 16,
    color: '#7b7b7b',
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 15,
    position: 'relative',
    zIndex: 500,
  },
  formField: {
    flex: 1,
    marginHorizontal: 5,
    position: 'relative',
    zIndex: 999,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    position: 'relative',
    zIndex: 1000,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'scroll',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 9999,
    paddingVertical: 4,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginHorizontal: 4,
    borderRadius: 4,
  },
  dropdownItemHover: {
    backgroundColor: '#f5f5f5',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 6,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  calculateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  calculateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  resultContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  resultValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    fontFamily: 'AsapCondensed_400Regular',
  },
  calculationsList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  calculationStep: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  updateDbContainer: {
    marginTop: 16,
    marginBottom: 80,
    paddingHorizontal: 16,
  },
  updateDbButton: {
    backgroundColor: '#2B7BB0',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#1a5a88',
  },
  updateDbButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'AsapCondensed_400Regular',
  },
  caseCalculatorContainer: {
    padding: 15,
    backgroundColor: '#fdfceb',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
    position: 'relative',
    zIndex: 2,
  },
  caseCalculatorTitle: {
    fontSize: 16,
    color: '#7b7b7b',
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  segmentedButtonActive: {
    backgroundColor: '#2B7BB0',
  },
  segmentedButtonText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  segmentedButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'AsapCondensed_400Regular',
  },
  caseResultContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#edf7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c5e1f5',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2B7BB0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#2B7BB0',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  checkboxWithPadding: {
    marginTop: 12,
  },
  updateCostButton: {
    backgroundColor: '#3E7C17',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  updateCostButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
    opacity: 0.7,
  },
  errorMessageContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  errorMessageText: {
    fontSize: 14,
    color: '#dc3545',
    fontFamily: 'AsapCondensed_400Regular',
  },
  button: {
    backgroundColor: '#6c757d',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  testButton: {
    backgroundColor: '#6c757d',
    marginTop: 10,
  },
  priceTable: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tableTitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modalDropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 9999,
    paddingVertical: 4,
  },
  activeDropdownItem: {
    backgroundColor: '#f0f0f0',
    borderLeftWidth: 3,
    borderLeftColor: '#2B7BB0',
  },
});