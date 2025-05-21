import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import ProductEditModal from '@/components/ProductEditModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import PageTitleBar from '@/components/PageTitleBar';
import { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryError, setTemporaryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Clear temporary error after 5 seconds
  useEffect(() => {
    if (temporaryError) {
      const timer = setTimeout(() => {
        setTemporaryError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [temporaryError]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_sn', { ascending: true });

      if (error) throw error;
      setProducts(data as unknown as Product[]);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowEditModal(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;

    try {
      // First check if the product is referenced in sale_items
      const { data: saleItems, error: checkError } = await supabase
        .from('sale_items')
        .select('id')
        .eq('product_id', deletingProduct.id)
        .limit(1);

      if (checkError) {
        console.error('Error checking product references:', checkError);
        throw new Error('Failed to check if product is in use');
      }

      // If product is in use (has references in sale_items)
      if (saleItems && saleItems.length > 0) {
        setTemporaryError(`Cannot delete "${deletingProduct.product_name}" because it is used in sales.`);
        setShowDeleteModal(false);
        return;
      }

      // If no references, proceed with deletion
      const { error } = await supabase
        .from('products')
        .delete()
        .match({ id: deletingProduct.id });

      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id));
      setShowDeleteModal(false);
      setDeletingProduct(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      setTemporaryError(err instanceof Error ? err.message : 'Failed to delete product');
      setShowDeleteModal(false);
    }
  };

  const handleSubmit = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            product_name: product.product_name,
            factory_price: product.factory_price,
            godown_price: product.godown_price,
            delivery_price: product.delivery_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        
        setProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? { ...p, ...product, updated_at: new Date().toISOString() } : p
        ));
      } else {
        // Add new product
        const { data, error } = await supabase
          .from('products')
          .insert({
            product_sn: product.product_sn,
            product_name: product.product_name,
            factory_price: product.factory_price,
            godown_price: product.godown_price,
            delivery_price: product.delivery_price,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as unknown as Database['public']['Tables']['products']['Insert'])
          .select()
          .single();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        if (data) {
          setProducts(prev => [...prev, data as unknown as Product]);
        }
      }

      setShowEditModal(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err instanceof Error ? err.message : 'Failed to save product');
    }
  };

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_sn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <View style={styles.container}>
        <PageTitleBar title="Product Management" showBack={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchProducts}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageTitleBar title="Product Management" showBack={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageTitleBar title="Product Management" showBack={true} />
      {temporaryError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{temporaryError}</Text>
        </View>
      )}
      <ScrollView style={styles.content}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products by name or ID"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product List</Text>
          
          <View style={styles.table}>
            <View style={styles.tableHeader}>
            
              <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
              <Text style={[styles.headerCell, styles.priceCell]}>Factory</Text>
              <Text style={[styles.headerCell, styles.priceCell]}>Godown</Text>
              <Text style={[styles.headerCell, styles.priceCell]}>Delivery</Text>
              <Text style={[styles.headerCell, styles.actionsCell]}>Actions</Text>
            </View>

            {filteredProducts.map((product) => (
              <View key={product.id} style={styles.tableRow}>
                
                <Text style={[styles.cellText, styles.nameCell]}>{product.product_name}</Text>
                <Text style={[styles.cellText, styles.priceCell]}>₹{product.factory_price}</Text>
                <Text style={[styles.cellText, styles.priceCell]}>₹{product.godown_price}</Text>
                <Text style={[styles.cellText, styles.priceCell]}>₹{product.delivery_price}</Text>
                <View style={[styles.cell, styles.actionsCell]}>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEditProduct(product)}
                    >
                      <Pencil size={24} color="#2B7BB0" />
                    </Pressable>
                    <Pressable 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteProduct(product)}
                    >
                      <Trash2 size={24} color="#dc3545" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.addButton}
            onPress={handleAddProduct}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add New Product</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ProductEditModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
        }}
        onSubmit={handleSubmit}
        product={editingProduct}
      />

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingProduct(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete ${deletingProduct?.product_name}? This action cannot be undone.`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B7BB0',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2B7BB0',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    textAlign: 'center',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  idCell: {
    flex: 1,
    paddingHorizontal: 6,
    textAlign: 'center',
  },
  nameCell: {
    flex: 1,
    paddingHorizontal: 6,
    textAlign: 'center',
  },
  priceCell: {
    flex: 1,
    paddingHorizontal: 6,
    textAlign: 'center',
  },
  actionsCell: {
    flex: 1,
    paddingHorizontal: 12,
    alignContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignContent: 'center',
  },
  actionButton: {
    padding: 2,
    borderRadius: 4,
    alignContent: 'center',
  },
  editButton: {
    backgroundColor: '#e3f2fd',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'AsapCondensed_400Regular',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  errorBannerText: {
    color: '#d32f2f',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
});