import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { FileText, Store, TrendingUp, X, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface SaleItem {
  id: string;
  created_at: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  price: number;
  total_amount: number;
  payment_method: string;
  type: string;
  items_summary?: string;
  items?: SaleLineItem[];
  invoice_number?: string;
  paid_amount?: number;
  remaining_amount?: number;
  product_id?: string;
}

interface SaleLineItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price: number;
  total: number;
  products?: {
    product_name: string;
    size?: string | null;
  };
}

// Define basic styles locally to prevent crashes
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    paddingBottom: 80,
  },
  scrollContainer: {
    flex: 1,
    marginBottom: 70, // Space for the button
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e53935',
    textAlign: 'center',
    marginBottom: 16,
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  createSaleButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createSaleButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  // Filter Styles
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 2,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#02AABD',
    marginHorizontal: 10,
    marginTop: 15,
  },
  filterButton: {
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#FBB03B',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#666',
  },
  // Summary Cards Styles
  summaryCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e0e0e0',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 10,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: '31%',
    borderWidth: 1,
    borderColor: '#eee',
    minHeight: 80,
  },
  factoryCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4e73df',
  },
  godownCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1cc88a',
  },
  quickCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f6c23e',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  cardCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    opacity: 0.7,
  },
  cardIconContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    opacity: 0.2,
  },
  tableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '95%',
    alignSelf: 'center',
    marginTop: 8,
  },
  tableHeader: {
    backgroundColor: '#4669d9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableBody: {
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  alternateRow: {
    backgroundColor: '#eef8fd',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cell: {
    fontSize: 14,
    color: '#333',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dateCell: {
    flex: 1,
  },
  customerCell: {
    flex: 0.8,
    textAlign: 'left',
  },
  amountCell: {
    flex: 0.8,
    textAlign: 'right',
  },
  modeCell: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCell: {
    flex: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCell: {
    flex: 1.5,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    textAlign: 'right',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  viewButton: {
    backgroundColor: '#d9e2ff',
  },
  pdfButton: {
    backgroundColor: '#ffebeb',
    flexDirection: 'row',
    minWidth: 130,
  },
  
  // Status badges
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  paidBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4caf50',
  },
  dueBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    color: '#f44336',
  },
  cashBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    color: '#2196f3',
  },
  creditBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    color: '#ff9800',
  },
  otherBadge: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
    color: '#757575',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2B7BB0',
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  companyTagline: {
    fontSize: 12,
    color: '#fff',
  },
  invoiceHeaderRight: {
    alignItems: 'flex-end',
  },
  cashLabel: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
    color: '#fff',
    marginBottom: 4,
  },
  invoiceHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  closeButtonCircle: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  modalBody: {
    padding: 16,
  },
  detailsContainer: {
    padding: 4,
  },
  detailCard: {
    backgroundColor: 'e6eeff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  detailCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B7BB0',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  totalAmount: {
    fontWeight: '700',
    fontSize: 16,
  },
  modalActions: {
    marginTop: 10,
    marginBottom: 4,
    alignItems: 'center',
  },
  textGreen: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  textRed: {
    color: '#e53935',
    fontWeight: '600',
  },
  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginBottom: 8,
    paddingVertical: 8,
  },
  itemHeaderCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  itemCell: {
    fontSize: 14,
    color: '#333',
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  productNameCell: {
    flex: 2,
    fontSize: 14,
    color: '#333',
    paddingHorizontal: 8,
    textAlign: 'left',
  },
  totalItemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
  },
  totalItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalItemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  paymentStatusLabel: {
    fontSize: 14,
    marginLeft: 4,
  },
  backButton: {
    backgroundColor: '#2B7BB0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  paginationButton: {
    backgroundColor: '#2B7BB0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  paginationButtonDisabled: {
    backgroundColor: '#ccc',
  },
  paginationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: '#666',
  },
  paginationText: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 16,
  },
  // Item styles for summary section
  itemsList: {
    flex: 1,
  },
  itemBullet: {
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 6,
    color: '#2B7BB0',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  itemQuantity: {
    fontWeight: '500',
    color: '#555',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pdfActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  shareButton: {
    backgroundColor: '#2B7BB0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function SalesHistoryScreen() {
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  
  // Summary statistics
  const [factorySales, setFactorySales] = useState({ count: 0, amount: 0 });
  const [godownSales, setGodownSales] = useState({ count: 0, amount: 0 });
  const [quickSales, setQuickSales] = useState({ count: 0, amount: 0 });
  
  // Date filter options: 'week', 'month', 'year', 'all'
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    // Attempt to ensure the database function exists (will be ignored if it fails)
    checkDatabaseFunction().catch(err => console.error('[SalesHistory] DB setup error:', err));
    
    // Fetch sales data
    fetchSalesHistory(currentPage);
    
    // Fetch summary statistics
    fetchSalesSummary(dateFilter);
  }, [currentPage, dateFilter]);

  // Function to fetch sales summary statistics
  const fetchSalesSummary = async (filter: string) => {
    try {
      console.log(`[SalesHistory] Fetching sales summary statistics with filter: ${filter}`);
      
      // Build date range filter
      let query = supabase
        .from('sales')
        .select('type, total_amount, created_at');
      
      // Apply date filter
      const now = new Date();
      
      if (filter === 'week') {
        // Calculate the date 7 days ago
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (filter === 'month') {
        // Calculate the date 30 days ago
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', monthAgo.toISOString());
      } else if (filter === 'year') {
        // Calculate the date 365 days ago
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', yearAgo.toISOString());
      }
      // If filter is 'all', no date filter is applied
      
      // Execute the query
      const { data, error } = await query;
      
      if (error) {
        console.error('[SalesHistory] Error fetching sales summary:', error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('[SalesHistory] No sales data found for summary');
        setFactorySales({ count: 0, amount: 0 });
        setGodownSales({ count: 0, amount: 0 });
        setQuickSales({ count: 0, amount: 0 });
        return;
      }
      
      // Initialize counters
      let factory = { count: 0, amount: 0 };
      let godown = { count: 0, amount: 0 };
      let quick = { count: 0, amount: 0 };
      
      // Process sales data
      data.forEach(sale => {
        const amount = sale.total_amount || 0;
        
        // Categorize by type
        if (sale.type === 'factory') {
          factory.count += 1;
          factory.amount += amount;
        } else if (sale.type === 'godown') {
          godown.count += 1;
          godown.amount += amount;
        } else if (sale.type === 'quick') {
          quick.count += 1;
          quick.amount += amount;
        } else if (sale.type === 'customer') {
          // Count customer sales as quick sales
          quick.count += 1;
          quick.amount += amount;
        }
      });
      
      // Update state
      setFactorySales(factory);
      setGodownSales(godown);
      setQuickSales(quick);
      
      console.log('[SalesHistory] Sales summary calculated:', {
        filter,
        factory: factory,
        godown: godown,
        quick: quick
      });
      
    } catch (err) {
      console.error('[SalesHistory] Error in fetchSalesSummary:', err);
    }
  };

  const fetchSalesHistory = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[SalesHistory] Fetching sales history for page:', page);

      // First, get the total count of sales
      const { count: totalCount, error: countError } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('[SalesHistory] Error counting sales:', countError);
        // Continue with the query even if count fails
      }

      // Calculate total pages
      const total = totalCount || 0;
      const pages = Math.ceil(total / itemsPerPage) || 1; // Ensure at least 1 page
      setTotalPages(pages);

      // Try the new query structure first
      let salesData = [];
      let salesError = null;

      try {
        // Fetch paginated sales data with simplified query - only columns that are guaranteed to exist
        const { data, error } = await supabase
          .from('sales')
          .select(`
            id,
            created_at,
            customer_id,
            type,
            payment_method,
            total_amount,
            status
          `)
          .order('created_at', { ascending: false })
          .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);
        
        salesData = data || [];
        salesError = error;
        
        // If that worked, try to fetch additional columns
        if (!error && data) {
          try {
            // Check if we can get extra fields for any of the items
            const { data: sampleData, error: sampleError } = await supabase
              .from('sales')
              .select('invoice_number, items_summary, product_id, quantity, price, paid_amount, remaining_amount')
              .eq('id', data[0]?.id || '00000000-0000-0000-0000-000000000000')
              .maybeSingle();
              
            if (!sampleError && sampleData) {
              // We successfully got the extra fields, now get them for all items
              const { data: enrichedData, error: enrichedError } = await supabase
                .from('sales')
                .select(`
                  id,
                  invoice_number,
                  items_summary,
                  product_id,
                  quantity,
                  price,
                  paid_amount,
                  remaining_amount
                `)
                .in('id', data.map(item => item.id))
                .order('created_at', { ascending: false });
                
              if (!enrichedError && enrichedData) {
                // Create a map of the enriched data by ID
                const enrichedMap: { [key: string]: any } = enrichedData.reduce((acc: { [key: string]: any }, item: any) => {
                  acc[item.id] = item;
                  return acc;
                }, {});
                
                // Merge the basic data with the enriched data
                salesData = data.map(item => ({
                  ...item,
                  ...enrichedMap[item.id]
                }));
              }
            }
          } catch (enrichError) {
            console.log('[SalesHistory] Could not fetch enriched data:', enrichError);
            // Continue with the basic data
          }
        }
      } catch (err) {
        console.error('[SalesHistory] Error with first query approach:', err);
        
        // If the first approach fails, try a more conservative query
        try {
          const { data, error } = await supabase
            .from('sales')
            .select('*')
            .order('created_at', { ascending: false })
            .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);
          
          salesData = data || [];
          salesError = error;
        } catch (fallbackErr) {
          console.error('[SalesHistory] Fallback query also failed:', fallbackErr);
          throw fallbackErr;
        }
      }

      if (salesError) {
        console.error('[SalesHistory] Error fetching sales:', salesError);
        throw salesError;
      }

      // Get customer names in a separate query
      const customerIds = salesData.map((sale: any) => sale.customer_id).filter(Boolean);
      let customerMap: {[key: string]: string} = {};
      
      if (customerIds.length > 0) {
        try {
          const { data: customerData } = await supabase
            .from('customers')
            .select('id, name')
            .in('id', customerIds);
            
          if (customerData) {
            customerMap = customerData.reduce((map: any, customer: any) => {
              map[customer.id] = customer.name;
              return map;
            }, {});
          }
        } catch (err) {
          console.error('[SalesHistory] Error fetching customer data:', err);
          // Continue without customer names if this fails
        }
      }

      // Format the sales data with customer names from our map
      const formattedSales: SaleItem[] = salesData.map((sale: any) => ({
        id: sale.id,
        created_at: sale.created_at,
        customer_name: customerMap[sale.customer_id] || 'Unknown Customer',
        product_name: '',  // Will be filled when items are fetched
        product_id: sale.product_id || null,
        quantity: sale.quantity || 0,
        price: sale.price || 0,
        total_amount: sale.total_amount || 0,
        payment_method: sale.payment_method || 'cash',
        type: sale.type || 'customer',
        items_summary: sale.items_summary || '',
        invoice_number: sale.invoice_number || '',
        // Only include these fields if they exist
        ...(sale.paid_amount !== undefined ? { paid_amount: sale.paid_amount } : {}),
        ...(sale.remaining_amount !== undefined ? { remaining_amount: sale.remaining_amount } : {}),
        items: []
      }));

      console.log('[SalesHistory] Fetched sales:', formattedSales.length);
      setSales(formattedSales);
    } catch (err) {
      console.error('[SalesHistory] Error in fetchSalesHistory:', err);
      setError('Failed to load sales history. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if the stored function exists and create it if needed
  const checkDatabaseFunction = async () => {
    try {
      // First try to call the function to see if it exists
      const { error } = await supabase.rpc('get_sales_items_with_products', {
        p_sale_id: '00000000-0000-0000-0000-000000000000' // dummy ID
      });
      
      if (error && error.message.includes('does not exist')) {
        console.log('[SalesHistory] Database function does not exist - skipping');
        // Function doesn't exist, but that's okay - we're using separate queries now
      }
    } catch (err) {
      console.error('[SalesHistory] Error checking database function:', err);
      // Continue even if this fails
    }
  };

  // Fix the fetchSaleItems function to correctly retrieve product information
  const fetchSaleItems = async (saleId: string): Promise<SaleLineItem[]> => {
    try {
      console.log(`[SalesHistory] Fetching items for sale: ${saleId}`);
      
      // First get the sale to retrieve its invoice_number
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select('invoice_number')
        .eq('id', saleId)
        .single();
      
      if (saleError) {
        console.error('[SalesHistory] Error fetching sale invoice number:', saleError);
        // Continue with null invoice_number
      }
      
      const invoiceNumber = saleData?.invoice_number;
      let items: SaleLineItem[] = [];
      
      // Try different approaches to fetch the items
      
      // 1. Try sale_items table with invoice_number
      if (invoiceNumber) {
        try {
          console.log(`[SalesHistory] Trying sale_items with invoice number: ${invoiceNumber}`);
          const { data, error } = await supabase
            .from('sale_items')
            .select('id, sale_id, product_id, quantity, price, total_price')
            .eq('invoice_number', invoiceNumber)
            .gt('price', 0); // Only return items with price > 0
          
          if (!error && data && data.length > 0) {
            console.log(`[SalesHistory] Found ${data.length} items in sale_items`);
            items = data.map(item => ({
              id: item.id,
              sale_id: item.sale_id,
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              total: item.total_price || (item.price * item.quantity)
            }));
          }
        } catch (err) {
          console.error('[SalesHistory] Error with sale_items by invoice:', err);
        }
      }
      
      // 2. If that failed, try sales_items table with invoice_number
      if (invoiceNumber && items.length === 0) {
        try {
          console.log(`[SalesHistory] Trying sales_items with invoice number: ${invoiceNumber}`);
          const { data, error } = await supabase
            .from('sales_items')
            .select('id, sale_id, product_id, quantity, price, total')
            .eq('invoice_number', invoiceNumber)
            .gt('price', 0); // Only return items with price > 0
          
          if (!error && data && data.length > 0) {
            console.log(`[SalesHistory] Found ${data.length} items in sales_items`);
            items = data;
          }
        } catch (err) {
          console.error('[SalesHistory] Error with sales_items by invoice:', err);
        }
      }
      
      // 3. Try sale_items with sale_id
      if (items.length === 0) {
        try {
          console.log(`[SalesHistory] Trying sale_items with sale_id: ${saleId}`);
          const { data, error } = await supabase
            .from('sale_items')
            .select('id, sale_id, product_id, quantity, price, total_price')
            .eq('sale_id', saleId)
            .gt('price', 0); // Only return items with price > 0
          
          if (!error && data && data.length > 0) {
            console.log(`[SalesHistory] Found ${data.length} items in sale_items`);
            items = data.map(item => ({
              id: item.id,
              sale_id: item.sale_id,
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              total: item.total_price || (item.price * item.quantity)
            }));
          }
        } catch (err) {
          console.error('[SalesHistory] Error with sale_items by sale_id:', err);
        }
      }
      
      // 4. Try sales_items with sale_id
      if (items.length === 0) {
        try {
          console.log(`[SalesHistory] Trying sales_items with sale_id: ${saleId}`);
          const { data, error } = await supabase
            .from('sales_items')
            .select('id, sale_id, product_id, quantity, price, total')
            .eq('sale_id', saleId)
            .gt('price', 0); // Only return items with price > 0
          
          if (!error && data && data.length > 0) {
            console.log(`[SalesHistory] Found ${data.length} items in sales_items`);
            items = data;
          }
        } catch (err) {
          console.error('[SalesHistory] Error with sales_items by sale_id:', err);
        }
      }
      
      // If we still didn't find anything, return empty array
      if (items.length === 0) {
        console.warn('[SalesHistory] No items found for sale:', saleId);
        return [];
      }
      
      console.log('[SalesHistory] Got sale items:', items.length);
      
      // Get actual product names from products table
      let productMap: {[key: string]: {product_name: string, size?: string}} = {};
      
      // Extract all unique product IDs from the items
      const productIds = [...new Set(items.map(item => item.product_id))].filter(Boolean);
      
      if (productIds.length > 0) {
        try {
          console.log(`[SalesHistory] Looking up products by IDs: ${productIds.join(', ')}`);
          
          // Fetch the product details, including name and size
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('id, product_name, product_id')
            .in('id', productIds);
          
          if (productError) {
            console.error('[SalesHistory] Product lookup error:', productError);
          } else if (productData && productData.length > 0) {
            console.log(`[SalesHistory] Found ${productData.length} products. Product details:`);
            
            // Extract size from product name (e.g., "250ml Bottle" => size: "250ml")
            productData.forEach(p => {
              // Extract size if product name contains common size patterns
              let size: string | undefined = undefined;
              const nameLower = p.product_name.toLowerCase();
              const sizePatterns = ['250ml', '500ml', '1000ml', '1l', '20l'];
              
              for (const pattern of sizePatterns) {
                if (nameLower.includes(pattern.toLowerCase())) {
                  size = pattern;
                  break;
                }
              }
              
              console.log(`[SalesHistory] Product ${p.id}: Name="${p.product_name}", Size="${size || 'N/A'}", ID="${p.product_id || 'N/A'}"`);
              
              // Add to product map
              productMap[p.id] = { 
                product_name: p.product_name || 'Unknown Product',
                size: size
              };
            });
          } else {
            console.warn('[SalesHistory] No products found for ids:', productIds);
            
            // Try fetching products one by one as a fallback
            console.log('[SalesHistory] Trying individual product lookups as fallback');
            for (const productId of productIds) {
              try {
                const { data: singleProduct, error: singleError } = await supabase
                  .from('products')
                  .select('id, product_name, product_id')
                  .eq('id', productId)
                  .single();
                
                if (!singleError && singleProduct) {
                  // Extract size if product name contains common size patterns
                  let size: string | undefined = undefined;
                  const nameLower = singleProduct.product_name.toLowerCase();
                  const sizePatterns = ['250ml', '500ml', '1000ml', '1l', '20l'];
                  
                  for (const pattern of sizePatterns) {
                    if (nameLower.includes(pattern.toLowerCase())) {
                      size = pattern;
                      break;
                    }
                  }
                  
                  console.log(`[SalesHistory] Found fallback product ${singleProduct.id}: "${singleProduct.product_name}", Size="${size || 'N/A'}"`);
                  productMap[productId] = {
                    product_name: singleProduct.product_name || 'Unknown Product',
                    size: size
                  };
                }
              } catch (singleErr) {
                console.error(`[SalesHistory] Error in fallback lookup for product ${productId}:`, singleErr);
              }
            }
          }
        } catch (err) {
          console.error('[SalesHistory] Error looking up products:', err);
        }
      }
      
      // Now add product info to each item and filter out invalid entries
      const processedItems = items
        .filter(item => item.price && item.price > 0) // Filter out zero-price items
        .map(item => {
          const productInfo = productMap[item.product_id];
          
          // Enhanced logging for debugging product display issues
          if (productInfo) {
            console.log(`[SalesHistory] Item ${item.id}: Found product "${productInfo.product_name}" with size "${productInfo.size || 'N/A'}"`);
          
            // Extract product name without bottle/label/etc. for cleaner display
            let cleanName = productInfo.product_name;
            ['Bottle', 'Label', 'Cap', 'Box'].forEach(suffix => {
              // Remove suffixes for cleaner display 
              cleanName = cleanName.replace(` ${suffix}`, '');
            });
          
            return {
              ...item,
              products: {
                product_name: cleanName,
                size: productInfo.size
              }
            };
          } else {
            console.log(`[SalesHistory] Item ${item.id}: No product info found for ID ${item.product_id}`);
          
            // Determine product name and size based on price if we don't have proper product info
            let inferredName = '';
          
            // Use price to guess the product size
            if (item.price === 180) {
              inferredName = '250ml';
            } else if (item.price === 170) {
              inferredName = '500ml';
            } else if (item.price === 244) {
              inferredName = '1L';
            } else if (item.price === 340) {
              inferredName = '20L';
            } else {
              inferredName = `₹${item.price}`;
            }
          
            return {
              ...item,
              products: {
                product_name: inferredName,
                size: undefined
              }
            };
          }
        });
      
      return processedItems;
    } catch (err) {
      console.error('[SalesHistory] Error in fetchSaleItems:', err);
      return []; // Return empty array on error
    }
  };

  // Function to consolidate items by product for display
  const consolidateItems = (items: SaleLineItem[]): SaleLineItem[] => {
    // Create a map to track items by product ID and price
    const itemMap: { [key: string]: SaleLineItem } = {};
    
    // Group items by product ID and price (to distinguish between same products sold at different prices)
    items.forEach(item => {
      const key = `${item.product_id}-${item.price}`;
      
      if (itemMap[key]) {
        // If this product+price combination already exists, update quantity and total
        itemMap[key].quantity += item.quantity;
        itemMap[key].total = itemMap[key].quantity * item.price;
      } else {
        // Otherwise, add it to the map
        itemMap[key] = { ...item };
      }
    });
    
    // Convert the map back to an array
    return Object.values(itemMap);
  };

  // Function to get a product name directly from the database
  const getProductName = async (productId: string): Promise<string> => {
    if (!productId) return 'Unknown Product';
    
    try {
      console.log(`[SalesHistory] Direct lookup for product: ${productId}`);
      const { data, error } = await supabase
        .from('products')
        .select('product_name')
        .eq('id', productId)
        .single();
        
      if (error || !data) {
        console.error(`[SalesHistory] Error looking up product ${productId}:`, error);
        return 'Unknown Product';
      }
      
      console.log(`[SalesHistory] Found product name: ${data.product_name}`);
      return data.product_name || 'Unknown Product';
    } catch (err) {
      console.error(`[SalesHistory] Exception looking up product ${productId}:`, err);
      return 'Unknown Product';
    }
  };

  // Update the handleViewDetails function to fetch items when needed
  const handleViewDetails = async (saleId: string) => {
    try {
      const sale = sales.find(s => s.id === saleId);
      if (sale) {
        // Show the modal immediately with loading state if needed
        setSelectedSale(sale);
        setDetailModalVisible(true);
        
        // If the sale record itself has a product_id but no product_name, try to fetch it
        if (sale.product_id && (!sale.product_name || sale.product_name === '')) {
          try {
            const productName = await getProductName(sale.product_id);
            sale.product_name = productName;
            // Update the sale record in the sales array
            setSales([...sales]);
          } catch (err) {
            console.error('[SalesHistory] Error fetching product name for sale:', err);
          }
        }
        
        // If the sale doesn't have items yet, fetch them
        if (!sale.items || sale.items.length === 0) {
          try {
            const items = await fetchSaleItems(saleId);
            // Update the sale with the fetched items
            if (items.length > 0) {
              console.log('[SalesHistory] Got items for display:', JSON.stringify(items, null, 2));
              
              // Handle duplicate water items - filter out zero-priced water if we have non-zero priced items
              const waterItems = items.filter(item => 
                item.products?.product_name === 'Water' && item.price === 0
              );
                
              const nonWaterItems = items.filter(item => 
                !(item.products?.product_name === 'Water' && item.price === 0)
              );
                
              // If we have both zero-priced water and other items, only use the non-water items
              let displayItems = items;
              if (waterItems.length > 0 && nonWaterItems.length > 0) {
                console.log('[SalesHistory] Filtering out zero-priced water items');
                displayItems = nonWaterItems;
              }
              
              // Log product information to help debug display issues
              displayItems.forEach((item, index) => {
                console.log(`[SalesHistory] Item ${index + 1}:`, {
                  product_name: item.products?.product_name,
                  product_id: item.product_id,
                  quantity: item.quantity,
                  price: item.price,
                  total: item.total,
                  calculated_total: item.price * item.quantity
                });
              });
              
              // Consolidate items before setting them
              const consolidatedItems = consolidateItems(displayItems);
              console.log('[SalesHistory] Consolidated items:', consolidatedItems.length);
              
              sale.items = consolidatedItems;
              // Force a re-render by creating a new sales array
              setSales([...sales]);
            }
          } catch (err) {
            console.error('[SalesHistory] Error fetching items for sale details:', err);
            // Continue with empty items
          }
        }
      }
    } catch (error) {
      console.error('Error viewing sale details:', error);
    }
  };

  const handlePrintInvoice = async (sale: SaleItem) => {
    try {
      console.log('[Receipt] Navigating to receipt viewer for sale:', sale.id);
      // Navigate to the dedicated receipt viewer screen with the sale ID
      router.push({
        pathname: `/sales/receipt`,
        params: { saleId: sale.id }
      });
    } catch (error: any) {
      console.error('[Receipt] Error navigating to receipt:', error);
      Alert.alert('Error', `Could not display receipt: ${error.message || 'Unknown error'}`);
    }
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedSale(null);
  };

  // Add pagination controls component
  const PaginationControls = () => (
    <View style={styles.paginationContainer}>
      <Pressable
        style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
        onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
          Previous
        </Text>
      </Pressable>
      <Text style={styles.paginationText}>
        Page {currentPage} of {totalPages}
      </Text>
      <Pressable
        style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
        onPress={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
          Next
        </Text>
      </Pressable>
    </View>
  );

  // Function to create a better display name for products
  const createDisplayName = (item: SaleLineItem): string => {
    // First, try to use the products object's product_name if it's meaningful
    if (item.products?.product_name && 
        item.products.product_name !== 'Unknown Product' &&
        item.products.product_name !== 'Water') {
      let name = item.products.product_name;
      
      // Check if the size pattern is already in the product name
      const sizePatterns = ['250ml', '500ml', '1000ml', '1l', '20l'];
      const productNameLower = name.toLowerCase();
      let sizeInName = false;
      
      for (const pattern of sizePatterns) {
        if (productNameLower.includes(pattern.toLowerCase())) {
          sizeInName = true;
          break;
        }
      }
      
      // Only add size if it's not already in the name and we have a size value
      if (!sizeInName && item.products.size) {
        name += ` (${item.products.size})`;
      }
      
      return name;
    }
    
    // If product name is "Water" or generic, make it more specific based on price
    // This helps distinguish between different water products
    if (item.products?.product_name === 'Water') {
      if (item.price === 180) return "250ml";
      if (item.price === 170) return "500ml";
      if (item.price === 244) return "1L";
      if (item.price === 340) return "20L";
      return `₹${item.price}`;
    }
    
    // Last resort fallback
    return item.price ? `₹${item.price}` : 'Unknown';
  };

  // Add the formatDate function back
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      
      // Format date as "DD MMM" (year removed as requested)
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      
      return `${day} ${month}`;
    } catch (err) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageTitleBar title="Sales History" showBack={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B7BB0" />
          <Text style={styles.loadingText}>Loading sales history...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <PageTitleBar title="Sales History" showBack={false} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchSalesHistory(currentPage)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageTitleBar title="Sales History" showBack={true} />
      
      {sales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No sales records found.</Text>
          <Pressable 
            style={styles.createSaleButton}
            onPress={() => router.push('/sales')}
          >
            <Text style={styles.createSaleButtonText}>Create a Sale</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.scrollContainer}>
          <ScrollView>
            {/* Date Filter Buttons */}
            <View style={styles.filterContainer}>
              <Pressable 
                style={[styles.filterButton, dateFilter === 'week' && styles.filterButtonActive]}
                onPress={() => setDateFilter('week')}
              >
                <Text style={[styles.filterButtonText, dateFilter === 'week' && styles.filterButtonTextActive]}>
                  Week
                </Text>
              </Pressable>
              
              <Pressable 
                style={[styles.filterButton, dateFilter === 'month' && styles.filterButtonActive]}
                onPress={() => setDateFilter('month')}
              >
                <Text style={[styles.filterButtonText, dateFilter === 'month' && styles.filterButtonTextActive]}>
                  Month
                </Text>
              </Pressable>
              
              <Pressable 
                style={[styles.filterButton, dateFilter === 'year' && styles.filterButtonActive]}
                onPress={() => setDateFilter('year')}
              >
                <Text style={[styles.filterButtonText, dateFilter === 'year' && styles.filterButtonTextActive]}>
                  Year
                </Text>
              </Pressable>
              
              <Pressable 
                style={[styles.filterButton, dateFilter === 'all' && styles.filterButtonActive]}
                onPress={() => setDateFilter('all')}
              >
                <Text style={[styles.filterButtonText, dateFilter === 'all' && styles.filterButtonTextActive]}>
                  All Time
                </Text>
              </Pressable>
            </View>
            
            {/* Summary Cards */}
            <View style={styles.summaryCardsContainer}>
              {/* Factory Sales Card */}
              <View style={[styles.summaryCard, styles.factoryCard]}>
                <Text style={styles.cardTitle}>FACTORY SALES</Text>
                <Text style={styles.cardAmount}>₹{factorySales.amount.toLocaleString()}</Text>
                <Text style={styles.cardCounter}>{factorySales.count}</Text>
                <View style={styles.cardIconContainer}>
                  <TrendingUp size={24} color="#4e73df" />
                </View>
              </View>
              
              {/* Godown Sales Card */}
              <View style={[styles.summaryCard, styles.godownCard]}>
                <Text style={styles.cardTitle}>GODOWN SALES</Text>
                <Text style={styles.cardAmount}>₹{godownSales.amount.toLocaleString()}</Text>
                <Text style={styles.cardCounter}>{godownSales.count}</Text>
                <View style={styles.cardIconContainer}>
                  <Store size={24} color="#1cc88a" />
                </View>
              </View>
              
              {/* Quick Sales Card */}
              <View style={[styles.summaryCard, styles.quickCard]}>
                <Text style={styles.cardTitle}>QUICK SALES</Text>
                <Text style={styles.cardAmount}>₹{quickSales.amount.toLocaleString()}</Text>
                <Text style={styles.cardCounter}>{quickSales.count}</Text>
                <View style={styles.cardIconContainer}>
                  <Zap size={24} color="#f6c23e" />
                </View>
              </View>
            </View>
            
            <View style={styles.tableContainer}>
              {/* Table header */}
              <View style={styles.tableHeader}>
                <View style={styles.tableRow}>
                  <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
                  <Text style={[styles.headerCell, styles.customerCell]}>Customer</Text>
                  <Text style={[styles.headerCell, styles.amountCell]}>Amount</Text>
                  <Text style={[styles.headerCell, styles.statusCell]}>Status</Text>
                  <Text style={[styles.headerCell, styles.actionCell]}>Action</Text>
                </View>
              </View>
              
              {/* Table body */}
              <View style={styles.tableBody}>
                {sales.map((sale) => (
                  <View key={sale.id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.dateCell]}>{formatDate(sale.created_at)}</Text>
                    <Text style={[styles.cell, styles.customerCell]}>{sale.customer_name}</Text>
                    <Text style={[styles.cell, styles.amountCell]}>₹{sale.total_amount}</Text>
                    <View style={[styles.cell, styles.statusCell]}>
                      <Text style={[
                        styles.badge,
                        sale.payment_method === 'credit' ? styles.dueBadge : styles.paidBadge
                      ]}>
                        {sale.payment_method === 'credit' ? 'DUE' : 'PAID'}
                      </Text>
                    </View>
                    <View style={[styles.cell, styles.actionCell]}>
                      <View style={styles.actionButtons}>
                        <Pressable
                          style={[styles.actionButton, styles.pdfButton]}
                          onPress={() => handlePrintInvoice(sale)}
                        >
                          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                            <FileText size={18} color="#FF5252" />
                            <Text style={{color: '#FF5252', marginLeft: 4, fontSize: 12, fontWeight: '500'}}>Generate Invoice</Text>
                          </View>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Pagination Controls */}
              <PaginationControls />
            </View>
          </ScrollView>
        </View>
      )}
      
      {/* Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Invoice-like header */}
            <View style={[styles.invoiceHeader, { backgroundColor: '#2B7BB0' }]}>
              <View style={styles.logoContainer}>
                <Text style={styles.companyName}>EverClear Water</Text>
                <Text style={styles.companyTagline}>with added minerals</Text>
              </View>
              <View style={styles.invoiceHeaderRight}>
                <Text style={styles.cashLabel}>
                  {selectedSale?.payment_method ? selectedSale.payment_method.toUpperCase() : 'CASH'}
                </Text>
                <Text style={styles.invoiceHeaderTitle}>INVOICE</Text>
              </View>
              <Pressable onPress={closeDetailModal} style={styles.closeButton}>
                <View style={styles.closeButtonCircle}>
                  <X size={16} color="#2B7BB0" />
                </View>
              </Pressable>
            </View>

            {selectedSale && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailsContainer}>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardTitle}>Sale Details</Text>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Invoice No:</Text>
                      <Text style={styles.detailValue}>
                        {selectedSale.invoice_number ? 
                          (selectedSale.invoice_number.startsWith('INV-') ? 
                            selectedSale.invoice_number : 
                            `INV-${formatDate(selectedSale.created_at).replace(/ /g, '').toUpperCase()}-${selectedSale.id.substring(0, 4)}`
                          ) : 
                          `INV-${formatDate(selectedSale.created_at).replace(/ /g, '').toUpperCase()}-${selectedSale.id.substring(0, 4)}`
                        }
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedSale.created_at)}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Customer:</Text>
                      <Text style={styles.detailValue}>{selectedSale.customer_name}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment:</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={[
                          styles.badge, 
                          selectedSale.payment_method === 'cash' ? styles.cashBadge : 
                          selectedSale.payment_method === 'credit' ? styles.creditBadge : styles.otherBadge
                        ]}>
                          {selectedSale.payment_method ? selectedSale.payment_method.toUpperCase() : 'CASH'}
                        </Text>
                        <Text style={[
                          styles.paymentStatusLabel,
                          selectedSale.payment_method === 'credit' ? styles.textRed : 
                          (selectedSale.paid_amount !== undefined && 
                           selectedSale.paid_amount < selectedSale.total_amount) ? styles.textRed : styles.textGreen
                        ]}>
                          {selectedSale.payment_method === 'credit' ? ' (Due)' : 
                          (selectedSale.paid_amount !== undefined && 
                           selectedSale.remaining_amount !== undefined && 
                           selectedSale.remaining_amount > 0) ? ' (Partial)' : ' (Paid)'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Add payment details for partial payments */}
                    {selectedSale.paid_amount !== undefined && selectedSale.paid_amount > 0 && 
                     selectedSale.remaining_amount !== undefined && selectedSale.remaining_amount > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Status:</Text>
                        <View style={{flexDirection: 'column', flex: 1}}>
                          <Text style={styles.detailValue}>Paid: ₹{selectedSale.paid_amount}</Text>
                          <Text style={[styles.detailValue, {color: '#e53935'}]}>Due: ₹{selectedSale.remaining_amount}</Text>
                        </View>
                      </View>
                    )}
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Sale Type:</Text>
                      <Text style={styles.detailValue}>{selectedSale.type}</Text>
                    </View>
                  </View>
                  
                  
                  {/* Items Section */}
                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardTitle}>Items</Text>
                    
                    <View style={styles.itemsHeader}>
                      <Text style={[styles.itemHeaderCell, { flex: 2, textAlign: 'left', paddingLeft: 12 }]}>Product</Text>
                      <Text style={[styles.itemHeaderCell, { flex: 1 }]}>Qty</Text>
                      <Text style={[styles.itemHeaderCell, { flex: 1 }]}>Price</Text>
                      <Text style={[styles.itemHeaderCell, { flex: 1 }]}>Total</Text>
                    </View>
                    
                    {selectedSale.items && selectedSale.items.length > 0 ? (
                      <>
                        {selectedSale.items
                          .filter(item => item.price && item.price > 0) // Filter out invalid items
                          .map((item, index) => {
                            // Calculate the correct total for this line item
                            const itemTotal = item.total || (item.price * item.quantity);
                            
                            // Create a better product display name
                            let displayName = createDisplayName(item);
                            
                            return (
                              <View key={item.id || index} style={styles.itemRow}>
                                <Text style={styles.productNameCell}>
                                  {displayName}
                                </Text>
                                <Text style={[styles.itemCell, { flex: 1 }]}>{item.quantity}</Text>
                                <Text style={[styles.itemCell, { flex: 1 }]}>₹{item.price}</Text>
                                <Text style={[styles.itemCell, { flex: 1 }]}>₹{itemTotal}</Text>
                              </View>
                            );
                          })}
                      </>
                    ) : (
                      selectedSale.product_id && selectedSale.price && selectedSale.price > 0 ? (
                        <View style={styles.itemRow}>
                          <Text style={[styles.itemCell, { flex: 2 }]}>
                            {/* Use same naming logic for single items */}
                            {selectedSale.product_name !== 'Water' ? 
                              selectedSale.product_name : 
                              (selectedSale.price === 180 ? "250ml" :
                               selectedSale.price === 170 ? "500ml" :
                               selectedSale.price === 244 ? "1L" :
                               selectedSale.price === 340 ? "20L" :
                               `₹${selectedSale.price}`)}
                          </Text>
                          <Text style={[styles.itemCell, { flex: 1 }]}>{selectedSale.quantity || 1}</Text>
                          <Text style={[styles.itemCell, { flex: 1 }]}>₹{selectedSale.price || 0}</Text>
                          <Text style={[styles.itemCell, { flex: 1 }]}>₹{selectedSale.total_amount}</Text>
                        </View>
                      ) : (
                        <View style={styles.itemRow}>
                          <Text style={[styles.itemCell, { flex: 4, textAlign: 'center', color: '#888' }]}>
                            No valid items found.
                          </Text>
                        </View>
                      )
                    )}
                    
                    <View style={styles.totalItemRow}>
                      <Text style={[styles.itemCell, { flex: 2, textAlign: 'right' }]}>Total Amount:</Text>
                      <Text style={[styles.itemCell, { flex: 1 }]}></Text>
                      <Text style={[styles.itemCell, { flex: 1 }]}></Text>
                      <Text style={[styles.itemCell, { flex: 1, fontWeight: 'bold' }]}>₹{selectedSale.total_amount}</Text>
                    </View>
                  </View>
                </View>
                
                {/* Action buttons */}
                <View style={styles.modalActions}>
                  {selectedSale && (
                    <Pressable
                      style={{
                        backgroundColor: '#FF0000',
                        paddingVertical: 12,
                        paddingHorizontal: 20,
                        borderRadius: 8,
                        marginVertical: 10
                      }}
                      onPress={() => handlePrintInvoice(selectedSale)}
                    >
                      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                        <FileText size={22} color="#FFFFFF" style={{marginRight: 8}} />
                        <Text style={{color: '#FFFFFF', fontWeight: '600', fontSize: 16}}>Generate Invoice PDF</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Back to Sales button */}
      <Pressable 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back to Sales</Text>
      </Pressable>
    </View>
  );
}

