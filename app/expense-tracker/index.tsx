import DatePicker from '@/components/DatePicker';
import PageTitleBar from '@/components/PageTitleBar';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Pizza, Receipt, Stethoscope, Timer, Truck, Wrench, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface ExpenseCategory {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description?: string;
}

export default function ExpenseTrackerScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const expensesPerPage = 10;

  const categories: ExpenseCategory[] = [
    { id: 'utilities', icon: <Receipt size={30} color="#2B7BB0" />, label: 'Utilities' },
    { id: 'medical', icon: <Stethoscope size={30} color="#4CAF50" />, label: 'Medical' },
    { id: 'maintenance', icon: <Wrench size={30} color="#FF9800" />, label: 'Maintenance' },
    { id: 'transport', icon: <Truck size={30} color="#9C27B0" />, label: 'Transport' },
    { id: 'food', icon: <Pizza size={30} color="#E91E63" />, label: 'Food' },
    { id: 'electricity', icon: <Zap size={30} color="#3F51B5" />, label: 'Electricity' },
    { id: 'other', icon: <Timer size={30} color="#795548" />, label: 'Other' },
  ];

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return null;
    
    // Clone the icon element with a smaller size for the expense list
    const icon = React.cloneElement(category.icon as React.ReactElement, { size: 20 });
    return icon;
  };

  const getCategoryColor = (categoryId: string): string => {
    switch(categoryId) {
      case 'utilities': return "#2B7BB0";  // Blue
      case 'medical': return "#4CAF50";    // Green
      case 'maintenance': return "#FF9800"; // Orange
      case 'transport': return "#9C27B0";  // Purple
      case 'food': return "#E91E63";       // Pink
      case 'electricity': return "#3F51B5"; // Indigo
      case 'supplies': return "#3F51B5";   // Keep for backward compatibility
      case 'other': return "#795548";      // Brown
      default: return "#666";              // Default gray
    }
  };

  const fetchExpenses = async (page = 1) => {
    setLoadingExpenses(true);
    try {
      // Get total count first
      const { count, error: countError } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error counting expenses:', countError);
      } else if (count !== null) {
        setTotalExpenses(count);
        setTotalPages(Math.ceil(count / expensesPerPage));
      }
      
      // Calculate offset based on page
      const offset = (page - 1) * expensesPerPage;
      
      // Fetch paginated expenses
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + expensesPerPage - 1);
      
      if (error) {
        console.error('Error fetching expenses:', error);
        setExpenses([]);
        return;
      }
      
      if (data) {
        const formattedExpenses = data.map((expense: any) => ({
          id: expense.id,
          date: new Date(expense.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          category: expense.category,
          amount: expense.amount,
          description: expense.description || undefined
        }));
        
        setExpenses(formattedExpenses);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('Error in fetchExpenses:', err);
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchExpenses(currentPage);
      } catch (err) {
        console.error('Error loading expenses data:', err);
        setLoadingExpenses(false);
      }
    };
    
    loadData();
  }, [currentPage]); // Re-fetch when the current page changes

  const handleSubmit = async () => {
    if (!selectedCategory || !amount || Number(amount) <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formattedDate = selectedDate.toISOString();
      
      const numericAmount = parseFloat(amount);
      
      if (isNaN(numericAmount)) {
        throw new Error("Invalid amount value");
      }
      
      const expenseData = {
        category: selectedCategory,
        amount: numericAmount,
        description: description.trim() || null
      };
      
      console.log("Submitting expense (simplified):", expenseData);
      
      let result = await supabase
        .from('expenses')
        .insert(expenseData as any);
        
      if (result.error) {
        console.error("First attempt error:", JSON.stringify(result.error));
        
        const dataWithDate = {
          ...expenseData,
          date_recorded: formattedDate
        };
        
        console.log("Trying with date_recorded:", dataWithDate);
        
        result = await supabase
          .from('expenses')
          .insert(dataWithDate as any);
          
        if (result.error) {
          console.error("Second attempt error:", JSON.stringify(result.error));
          throw new Error(`Database error: ${result.error.message || "Unknown error"}`);
        }
      }

      console.log("Expense added successfully");

      setSelectedCategory(null);
      setAmount('');
      setDescription('');
      setSelectedDate(new Date());
      
      // After successful submission, reset to page 1 to see the newest expense
      setCurrentPage(1);
      fetchExpenses(1);
      
      setError(null);
      
    } catch (err) {
      console.error('Error adding expense:', err);
      if (err instanceof Error) {
        setError(`Failed to add expense: ${err.message}`);
      } else {
        setError('Failed to add expense. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = selectedCategory && amount && Number(amount) > 0;

  // Pagination control handlers
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
      <PageTitleBar title="Track Expenses" showBack={false} />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Make Expense Entry</Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <View style={styles.categories}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonSelected,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                {selectedCategory === category.id 
                  ? category.icon 
                  : React.cloneElement(category.icon as React.ReactElement, { color: "#888" })
                }
                <Text style={[
                  styles.categoryBadge,
                  selectedCategory === category.id && styles.categoryBadgeSelected
                ]}
                numberOfLines={1}
                ellipsizeMode="tail">
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            <View style={styles.inputRow}>
              <View style={styles.amountInput}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.dateInput}>
                <DatePicker
                  value={selectedDate}
                  onChange={(date: Date | null) => {
                    if (date) setSelectedDate(date);
                  }}
                  label="Date"
                />
              </View>
            </View>

            <View style={styles.notesInput}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes about the expense"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
            </View>

            <Pressable
              style={[
                styles.addButton,
                (!isValid || isSubmitting) && styles.addButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              <Text style={styles.addButtonText}>
                {isSubmitting ? 'Adding...' : 'Add Expense'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.centeredTitle]}>Past Expenses</Text>
          
          <View style={styles.expenseList}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.dateHeaderCell]}>Date</Text>
              <Text style={[styles.headerCell, styles.categoryHeaderCell]}>Category</Text>
              <Text style={[styles.headerCell, styles.amountHeaderCell]}>Amount</Text>
              <Text style={[styles.headerCell, styles.notesHeaderCell]}>Notes</Text>
            </View>
            
            {loadingExpenses ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2B7BB0" />
                <Text style={styles.loadingText}>Loading expenses...</Text>
              </View>
            ) : expenses.length > 0 ? (
              <>
                {expenses.map((expense) => (
                  <View key={expense.id} style={styles.expenseItem}>
                    <Text style={styles.dateCell}>{expense.date}</Text>
                    <View style={styles.categoryCell}>
                      <View style={[
                        styles.categoryIconContainer, 
                        { backgroundColor: `${getCategoryColor(expense.category)}15` }
                      ]}>
                        {getCategoryIcon(expense.category)}
                      </View>
                      <Text style={[
                        styles.categoryText,
                        { color: getCategoryColor(expense.category) }
                      ]} numberOfLines={1} ellipsizeMode="tail">
                        {expense.category}
                      </Text>
                    </View>
                    <Text style={styles.amountCell}>₹{expense.amount.toLocaleString()}</Text>
                    <Text 
                      style={[
                        styles.notesCell, 
                        { color: getCategoryColor(expense.category) }
                      ]} 
                      numberOfLines={2} 
                      ellipsizeMode="tail"
                    >
                      {expense.description || '-'}
                    </Text>
                  </View>
                ))}
                
                {/* Pagination controls */}
                {totalPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <Pressable 
                      style={[
                        styles.paginationButton, 
                        currentPage === 1 && styles.paginationButtonDisabled
                      ]}
                      onPress={goToPrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={18} color={currentPage === 1 ? "#999" : "#2B7BB0"} />
                    </Pressable>
                    
                    <Text style={styles.paginationText}>
                      Page {currentPage} of {totalPages}
                    </Text>
                    
                    <Pressable 
                      style={[
                        styles.paginationButton, 
                        currentPage === totalPages && styles.paginationButtonDisabled
                      ]}
                      onPress={goToNextPage}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={18} color={currentPage === totalPages ? "#999" : "#2B7BB0"} />
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noExpensesText}>No expenses found</Text>
            )}
          </View>
        </View>
      </ScrollView>
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
  },
  contentContainer: {
    paddingBottom: 90,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B7BB0',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
    textAlign: 'left',
  },
  centeredTitle: {
    textAlign: 'center',
  },
  categories: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  categoryButton: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
    position: 'relative',
  },
  categoryButtonSelected: {
    borderColor: '#dcdcdc',
    backgroundColor: '#fcffd5',
  },
  form: {
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  amountInput: {
    flex: 1,
  },
  dateInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  expenseList: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#00b0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  headerCell: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'AsapCondensed_400Regular',
    fontWeight: 'bold',
  },
  dateHeaderCell: {
    width: 60,
  },
  categoryHeaderCell: {
    width: 110,
    paddingLeft: 4,
  },
  amountHeaderCell: {
    width: 80,
    textAlign: 'right',
  },
  notesHeaderCell: {
    flex: 1,
    marginLeft: 8,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  dateCell: {
    width: 60,
    color: '#666',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  categoryCell: {
    width: 110,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
    fontFamily: 'AsapCondensed_400Regular',
    flex: 1,
    marginLeft: 4,
  },
  amountCell: {
    width: 80,
    textAlign: 'right',
    color: '#333',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  notesCell: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
    paddingRight: 4,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#f57c00',
    fontFamily: 'AsapCondensed_400Regular',
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
  notesInput: {
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  noExpensesText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  // Add pagination styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  paginationButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 10,
    fontFamily: 'AsapCondensed_400Regular',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: -14,
    left: 0,
    right: 0,
    backgroundColor: '#eaeaea',
    paddingVertical: 1,
    paddingHorizontal: 3,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
    textTransform: 'uppercase',
    flexShrink: 0,
    flexGrow: 0,
  },
  categoryBadgeSelected: {
    backgroundColor: '#2B7BB0',
    color: '#fff',
  },
});