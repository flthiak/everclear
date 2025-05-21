import ErrorDisplay from '@/components/ErrorDisplay';
import GodownTransferModal from '@/components/GodownTransferModal';
import PageTitleBar from '@/components/PageTitleBar';
import ProductionModal from '@/components/ProductionModal';
import { StockTable } from '@/components/StockTable';
import useScreenTransition from '@/hooks/useScreenTransition';
import { useStockData } from '@/hooks/useStockData';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { ArrowDown, Factory } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

// Simple UUID generator function (RFC4122 version 4 compliant)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type Product = Database['public']['Tables']['products']['Row'];
type StockItem = Database['public']['Tables']['factory_stock']['Row'] & {
  product: Product;
};
type DailyProduction = Database['public']['Tables']['daily_production']['Row'] & {
  product: Product;
};

export default function StockScreen() {
  const { AnimatedContainer } = useScreenTransition();
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showGodownModal, setShowGodownModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { 
    factoryStock, 
    godownStock, 
    todaysProduction, 
    isLoading, 
    error, 
    refreshData,
    allProducts 
  } = useStockData();

  // Handle pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleProductionSubmit = async (production: { [key: string]: number }) => {
    try {
      for (const [productSn, quantity] of Object.entries(production)) {
        if (quantity > 0) {
          // Find the product in factoryStock or in allProducts
          let stockItem = factoryStock.find(item => item.product_sn === productSn);
          let product = null;
          
          // If product isn't in factoryStock, find it in allProducts and create a new stockItem
          if (!stockItem) {
            product = allProducts.find(p => p.product_sn === productSn);
            if (!product) {
              console.error(`Product ${productSn} not found`);
              throw new Error(`Product ${productSn} not found`);
            }
            
            // Create a new stockItem if product is found but not in factory stock
            stockItem = {
              id: `temp_${generateUUID()}`,
              product_id: product.id,
              product_sn: product.product_sn,
              product_name: product.product_name,
              quantity: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              product: product,
              value: 0
            };
          }

          console.log('Recording production for:', {
            productSn,
            quantity,
            productId: stockItem.product_id,
            productName: stockItem.product.product_name
          });

          let dailyProductionResult;
          
          // Check if we already have production for this product today
          const today = new Date().toISOString().split('T')[0]; // Just the date part YYYY-MM-DD
          
          const { data: existingProduction, error: fetchError } = await supabase
            .from('daily_production')
            .select('*')
            .eq('product_sn', stockItem.product_sn)
            .gte('created_at', today)
            .lt('created_at', today + 'T23:59:59.999Z')
            .maybeSingle();
          
          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error('Error checking existing production:', fetchError);
            throw new Error(`Failed to check existing production: ${fetchError.message}`);
          }
          
          if (existingProduction) {
            // Update existing production record
            console.log('Updating existing production record:', existingProduction);
            const updatedQuantity = existingProduction.quantity + quantity;
            
            const { error: updateError, data: updatedProduction } = await supabase
              .from('daily_production')
              .update({
                quantity: updatedQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProduction.id)
              .select();
              
            if (updateError) {
              console.error('Error updating daily production:', updateError);
              throw new Error(`Failed to update daily production: ${updateError.message}`);
            }
            
            dailyProductionResult = updatedProduction;
            console.log('Daily production updated:', dailyProductionResult);
          } else {
            // Create new production record
            const dailyProductionData = {
              id: generateUUID(),
              product_id: stockItem.product_id,
              product_sn: stockItem.product_sn,
              product_name: stockItem.product.product_name,
              quantity: quantity,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as const;
            
            const { error: insertError, data: newProduction } = await supabase
              .from('daily_production')
              .insert([dailyProductionData])
              .select();
              
            if (insertError) {
              console.error('Error recording daily production:', insertError);
              throw new Error(`Failed to record daily production: ${insertError.message}`);
            }
            
            dailyProductionResult = newProduction;
            console.log('New daily production recorded:', dailyProductionResult);
          }

          // Deduct raw materials based on product type and quantity
          await deductRawMaterialsForProduction(stockItem.product.product_name, quantity);

          // Update factory stock
          const newFactoryQuantity = stockItem.quantity + quantity;
          console.log('Updating factory stock:', {
            productSn,
            currentQuantity: stockItem.quantity,
            newQuantity: newFactoryQuantity
          });

          const factoryStockData = {
            id: stockItem.id.startsWith('temp_') ? generateUUID() : stockItem.id,
            product_id: stockItem.product_id,
            product_sn: stockItem.product_sn,
            product_name: stockItem.product.product_name,
            quantity: newFactoryQuantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as const;

          const { error: stockError, data: stockData } = await supabase
            .from('factory_stock')
            .upsert(factoryStockData)
            .select();

          if (stockError) {
            console.error('Error updating factory stock:', stockError);
            throw new Error(`Failed to update factory stock: ${stockError.message}`);
          }

          console.log('Factory stock updated:', stockData);
        }
      }

      await refreshData();
      setShowProductionModal(false);
    } catch (err) {
      console.error('Error in handleProductionSubmit:', err);
      if (err instanceof Error) {
        throw new Error(`Failed to record production: ${err.message}`);
      } else {
        throw new Error('Failed to record production. Please try again.');
      }
    }
  };

  // Function to deduct raw materials based on product produced
  const deductRawMaterialsForProduction = async (productName: string, quantity: number) => {
    console.log(`Deducting raw materials for ${quantity} units of ${productName}`);
    
    try {
      // Determine which raw materials to deduct based on product type
      let rawMaterialsToDeduct: {material: string, type: string, amount: number}[] = [];
      
      if (productName.includes('250ml')) {
        // 250ml production: (1 cap, 1 label, 1 preform) * 35 + 1 LD case
        const bottlesPerCase = 35;
        rawMaterialsToDeduct = [
          { material: 'Caps', type: '28mm', amount: quantity * bottlesPerCase },
          { material: 'Labels', type: '250ml', amount: quantity * bottlesPerCase },
          { material: 'Preform', type: '12.5g', amount: quantity * bottlesPerCase },
          { material: 'LD Shrink', type: '580mm x 85mic', amount: quantity } // 1 LD per case
        ];
      } else if (productName.includes('500ml')) {
        // 500ml production: (1 cap, 1 label, 1 preform (19g)) * 24 + 1 LD
        const bottlesPerCase = 24;
        rawMaterialsToDeduct = [
          { material: 'Caps', type: '28mm', amount: quantity * bottlesPerCase },
          { material: 'Labels', type: '500ml', amount: quantity * bottlesPerCase },
          { material: 'Preform', type: '19.4g', amount: quantity * bottlesPerCase },
          // Note: Removed Shrinksleeve as it doesn't exist in the database
          { material: 'LD Shrink', type: '580mm x 85mic', amount: quantity } // 1 LD per case
        ];
      } else if (productName.includes('1000ml') || productName.includes('1L')) {
        // 1000ml production: (1 cap, 1 label, 1 preform (19g)) * 15 + 1 LD
        const bottlesPerCase = 15;
        rawMaterialsToDeduct = [
          { material: 'Caps', type: '28mm', amount: quantity * bottlesPerCase },
          { material: 'Labels', type: '1000ml', amount: quantity * bottlesPerCase },
          { material: 'Preform', type: '19.4g', amount: quantity * bottlesPerCase },
          // Note: Removed Shrinksleeve as it doesn't exist in the database
          { material: 'LD Shrink', type: '580mm x 85mic', amount: quantity } // 1 LD per case
        ];
      } else {
        console.log(`Unknown product type: ${productName}, skipping raw material deduction`);
        return;
      }
      
      console.log('Raw materials to deduct:', rawMaterialsToDeduct);
      
      // Deduct each raw material from inventory
      for (const { material, type, amount } of rawMaterialsToDeduct) {
        // Get current raw material inventory
        const { data: rawMaterials, error: fetchError } = await supabase
          .from('raw_materials')
          .select('*')
          .eq('material', material)
          .eq('type', type)
          .single();
        
        if (fetchError) {
          console.error(`Error fetching raw material ${material} ${type}:`, fetchError);
          continue; // Skip this material if there's an error
        }
        
        if (!rawMaterials) {
          console.error(`Raw material ${material} ${type} not found`);
          continue;
        }
        
        // Calculate storage unit quantity based on material type
        let storageUnitChange = 0;
        
        if (material === 'Preform') {
          if (type.includes('19.4g')) {
            // 19.4g preforms: 25kg / 19.4g = 1,288.66 pieces per bag
            storageUnitChange = Math.ceil(amount / 1288.66);
          } else if (type.includes('12.5g')) {
            // 12.5g preforms: 25kg / 12.5g = 2,000 pieces per bag
            storageUnitChange = Math.ceil(amount / 2000);
          } else {
            // Standard calculation for other preforms
            storageUnitChange = Math.ceil(amount / 2000);
          }
        } else if (material === 'Caps') {
          // Assuming 8500 caps per box
          storageUnitChange = Math.ceil(amount / 8500);
        } else if (material === 'Labels') {
          // Labels (capsleeves): 200 pcs per pack
          storageUnitChange = Math.ceil(amount / 200);
        } else if (material === 'LD Shrink') {
          // LD Shrink: 560 cases per roll
          storageUnitChange = Math.ceil(amount / 560);
        } else {
          // Default 1:1 deduction for unknown materials
          storageUnitChange = amount;
        }
        
        // Cap at available quantity to prevent negatives
        storageUnitChange = Math.min(storageUnitChange, rawMaterials.available_quantity);
        
        // Calculate new quantities
        const newAvailableQuantity = Math.max(0, rawMaterials.available_quantity - storageUnitChange);
        
        // If actual_count exists, use it for piece-based deduction, otherwise calculate
        let newActualCount;
        if (rawMaterials.actual_count !== undefined && rawMaterials.actual_count !== null) {
          // Use actual_count directly
          newActualCount = Math.max(0, rawMaterials.actual_count - amount);
          console.log(`Updating ${material} ${type} actual count: ${rawMaterials.actual_count} - ${amount} = ${newActualCount}`);
        } else {
          // No need to calculate if we don't have the field
          newActualCount = null;
        }
        
        console.log(`Updating ${material} ${type} storage units: ${rawMaterials.available_quantity} - ${storageUnitChange} = ${newAvailableQuantity}`);
        
        // Prepare update data
        const updateData: any = {
          available_quantity: newAvailableQuantity
        };
        
        // Only include actual_count if it exists in the table
        if (newActualCount !== null) {
          updateData.actual_count = newActualCount;
        }
        
        // Update raw material in database
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update(updateData)
          .eq('id', rawMaterials.id);
        
        if (updateError) {
          console.error(`Error updating raw material ${material} ${type}:`, updateError);
        } else {
          console.log(`Successfully deducted from ${material} ${type}`);
        }
      }
    } catch (error) {
      console.error('Error deducting raw materials:', error);
      throw new Error(`Failed to deduct raw materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGodownTransfer = async (transfer: { [key: string]: number }) => {
    try {
      for (const [productSn, quantity] of Object.entries(transfer)) {
        if (quantity > 0) {
          const factoryItem = factoryStock.find(item => item.product_sn === productSn);
          if (!factoryItem || factoryItem.quantity < quantity) {
            throw new Error(`Insufficient stock for ${factoryItem?.product.product_name}`);
          }

          // Update factory stock (decrease)
          const factoryUpdateData = {
            quantity: factoryItem.quantity - quantity,
            updated_at: new Date().toISOString()
          } as const;

          const { error: factoryError } = await supabase
            .from('factory_stock')
            .update(factoryUpdateData)
            .eq('product_sn' as keyof Database['public']['Tables']['factory_stock']['Row'], productSn);

          if (factoryError) {
            console.error('Error updating factory stock:', factoryError);
            throw new Error(`Failed to update factory stock: ${factoryError.message}`);
          }

          // Check if item exists in godown stock
          const { data: existingGodownItem, error: selectError } = await supabase
            .from('godown_stock')
            .select('*')
            .eq('product_sn' as keyof Database['public']['Tables']['godown_stock']['Row'], productSn)
            .single();

          if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error('Error checking godown stock:', selectError);
            throw new Error(`Failed to check godown stock: ${selectError.message}`);
          }

          if (existingGodownItem) {
            // Update existing godown stock (increase)
            const godownUpdateData = {
              quantity: existingGodownItem.quantity + quantity,
              updated_at: new Date().toISOString()
            } as const;

            const { error: godownError } = await supabase
              .from('godown_stock')
              .update(godownUpdateData)
              .eq('product_sn' as keyof Database['public']['Tables']['godown_stock']['Row'], productSn);

            if (godownError) {
              console.error('Error updating godown stock:', godownError);
              throw new Error(`Failed to update godown stock: ${godownError.message}`);
            }
          } else {
            // Insert new godown stock item
            const godownInsertData = {
              id: generateUUID(),
              product_id: factoryItem.product_id,
              product_sn: productSn,
              product_name: factoryItem.product.product_name,
              quantity: quantity,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as const;

            const { error: godownError } = await supabase
              .from('godown_stock')
              .insert(godownInsertData);

            if (godownError) {
              console.error('Error inserting godown stock:', godownError);
              throw new Error(`Failed to add to godown stock: ${godownError.message}`);
            }
          }
        }
      }

      await refreshData();
      setShowGodownModal(false);
    } catch (err) {
      console.error('Error transferring stock:', err);
      if (err instanceof Error) {
        throw new Error(`Failed to transfer stock: ${err.message}`);
      } else {
        throw new Error('Failed to transfer stock. Please try again.');
      }
    }
  };

  if (error) {
    return (
      <AnimatedContainer style={styles.container}>
        <PageTitleBar title="Stock Management" showBack={true} />
        <ErrorDisplay message={error} onRetry={refreshData} />
      </AnimatedContainer>
    );
  }

  if (isLoading) {
    return (
      <AnimatedContainer style={styles.container}>
        <PageTitleBar title="Stock Management" showBack={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading stock data...</Text>
        </View>
      </AnimatedContainer>
    );
  }

  return (
    <AnimatedContainer style={styles.container}>
      <PageTitleBar title="Stock Management" showBack={false} />
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Total Inventory */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Inventory</Text>
          <Text style={styles.updateInfo}>
            Last Updated: {new Date().toLocaleString()}
          </Text>
          <StockTable
            data={factoryStock.map(item => {
              const godownItem = godownStock.find(g => g.product_sn === item.product_sn);
              const totalQuantity = (item.quantity || 0) + (godownItem?.quantity || 0);
              const value = (item.quantity * (item.product.factory_price || 0)) + 
                          ((godownItem?.quantity || 0) * (godownItem?.product.godown_price || 0));
              
              return {
                id: item.product.product_sn,
                name: item.product.product_name,
                quantity: totalQuantity,
                price: item.product.factory_price,
                value
              };
            })}
            showTotal={true}
            showPrice={true}
          />
        </View>

        {/* Today's Production */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Production</Text>
          <Text style={styles.updateInfo}>
            Last Updated: {todaysProduction.length > 0 ? 
              new Date(todaysProduction[0].created_at).toLocaleString() : 'No records yet'}
          </Text>
          <StockTable
            data={(() => {
              // If we have no production data, return empty array
              if (!todaysProduction || todaysProduction.length === 0) {
                return [];
              }
              
              // Create a map to consolidate production by product_sn
              const productMap = new Map();
              
              // Group and sum quantities by product_sn
              todaysProduction.forEach(prod => {
                if (productMap.has(prod.product_sn)) {
                  const existing = productMap.get(prod.product_sn);
                  existing.quantity += prod.quantity;
                } else {
                  productMap.set(prod.product_sn, {...prod});
                }
              });
              
              // Convert map to array and format for display
              return Array.from(productMap.values()).map(prod => {
                // Find the product details from factoryStock or allProducts
                const factoryItem = factoryStock.find(item => item.product_sn === prod.product_sn);
                const product = factoryItem?.product || 
                               allProducts.find(p => p.product_sn === prod.product_sn);
                
                const price = product?.factory_price || 0;
                
                return {
                  id: prod.product_sn,
                  name: prod.product_name,
                  quantity: prod.quantity,
                  price: price,
                  value: prod.quantity * price
                };
              });
            })()}
            showProduction={true}
            showTotal={true}
            showPrice={true}
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable 
              style={[styles.button, styles.productionButton]}
              onPress={() => setShowProductionModal(true)}
            >
              <Factory size={18} color="#fff" />
              <Text style={styles.buttonText}>Add Production</Text>
            </Pressable>

            <Pressable 
              style={[styles.button, styles.godownButton]}
              onPress={() => setShowGodownModal(true)}
            >
              <ArrowDown size={18} color="#fff" />
              <Text style={styles.buttonText}>Send to Godown</Text>
            </Pressable>
          </View>
        </View>

        {/* Factory Stock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Factory Stock</Text>
          <Text style={styles.updateInfo}>
            Last Updated: {factoryStock.length > 0 && !factoryStock[0].id.startsWith('temp_') ? 
              new Date(factoryStock[0].created_at).toLocaleString() : 'No records yet'}
          </Text>
          <StockTable
            data={factoryStock.map(item => ({
              id: item.product.product_sn,
              name: item.product.product_name,
              quantity: item.quantity,
              price: item.product.factory_price,
              value: item.quantity * (item.product.factory_price || 0)
            }))}
            showTotal={true}
            showPrice={true}
          />
        </View>

        {/* Godown Stock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Godown Stock</Text>
          <Text style={styles.updateInfo}>
            Last Updated: {godownStock.length > 0 && !godownStock[0].id.startsWith('temp_') ? 
              new Date(godownStock[0].created_at).toLocaleString() : 'No records yet'}
          </Text>
          <StockTable
            data={godownStock.map(item => ({
              id: item.product.product_sn,
              name: item.product.product_name,
              quantity: item.quantity,
              price: item.product.godown_price,
              value: item.quantity * (item.product.godown_price || 0)
            }))}
            showTotal={true}
            showPrice={true}
          />
        </View>
      </ScrollView>

      <ProductionModal
        visible={showProductionModal}
        onClose={() => setShowProductionModal(false)}
        onSubmit={handleProductionSubmit}
        products={factoryStock.length > 0 
          ? factoryStock.map(item => ({
              id: item.product_sn,
              name: item.product.product_name,
              currentStock: item.quantity
            })) 
          : allProducts.map(product => ({
              id: product.product_sn,
              name: product.product_name,
              currentStock: 0
            }))
        }
      />

      <GodownTransferModal
        visible={showGodownModal}
        onClose={() => setShowGodownModal(false)}
        onSubmit={handleGodownTransfer}
        products={factoryStock.length > 0 ? factoryStock.map(item => ({
          id: item.product_sn,
          name: item.product.product_name,
          currentStock: item.quantity
        })) : []}
      />
    </AnimatedContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fcfe',
    paddingBottom: 60,
  },
  content: {
    flex: 1,
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 110, // Add padding to the bottom to ensure content isn't hidden behind the nav bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
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
    marginBottom: 6,
    paddingLeft: 8,
    color: '#2B7BB0',
    paddingTop: 4,
  },
  updateInfo: {
    fontSize: 12,
    color: '#006390',
    marginBottom: 4,
    fontFamily: 'AsapCondensed_400Regular',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 8,
    gap: 8,
  },
  productionButton: {
    backgroundColor: '#4CAF50',
  },
  godownButton: {
    backgroundColor: '#2B7BB0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
});