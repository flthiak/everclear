import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Share, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import PageTitleBar from '@/components/PageTitleBar';
import { Calendar, ChevronDown, FileText, ListFilter as Filter, IndianRupee, Printer, User } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

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
  staff_name?: string;
}

interface MonthlyReport {
  month: string;
  year: number;
  totalSalaries: number;
  totalPayments: number;
  balance: number;
  staffCount: number;
}

export default function StaffReportScreen() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  useEffect(() => {
    fetchStaffData();
    fetchPaymentsData();
  }, []);

  useEffect(() => {
    if (staff.length > 0 && payments.length > 0) {
      generateMonthlyReports();
    }
  }, [staff, payments]);

  const fetchStaffData = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name');

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff data:', err);
      setError('Failed to load staff data');
    }
  };

  const fetchPaymentsData = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_payments')
        .select(`
          id,
          staff_id,
          amount,
          purpose,
          payment_date,
          staff:staff_id (name)
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      
      // Format the payments data
      const formattedPayments = data?.map(payment => ({
        id: payment.id,
        staff_id: payment.staff_id,
        amount: payment.amount,
        purpose: payment.purpose,
        payment_date: payment.payment_date,
        staff_name: payment.staff?.name || 'Unknown'
      })) || [];
      
      setPayments(formattedPayments);
    } catch (err) {
      console.error('Error fetching payments data:', err);
      setError('Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyReports = () => {
    // Get all unique months from payments
    const paymentDates = payments.map(payment => new Date(payment.payment_date));
    
    // Add current month and previous months
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(today.getMonth() - i);
      paymentDates.push(date);
    }
    
    // Get unique year-month combinations
    const uniqueMonths = Array.from(new Set(
      paymentDates.map(date => `${date.getFullYear()}-${date.getMonth() + 1}`)
    )).sort().reverse();
    
    // Generate report for each month
    const reports = uniqueMonths.map(yearMonth => {
      const [year, month] = yearMonth.split('-').map(Number);
      const monthDate = new Date(year, month - 1, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'long' });
      
      // Calculate total base pay for the month
      const totalSalaries = staff.reduce((sum, member) => sum + member.base_pay, 0);
      
      // Calculate payments made in this month
      const monthPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        return paymentDate.getFullYear() === year && paymentDate.getMonth() === month - 1;
      });
      
      const totalPayments = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      return {
        month: monthName,
        year,
        totalSalaries,
        totalPayments,
        balance: totalSalaries - totalPayments,
        staffCount: staff.length
      };
    });
    
    setMonthlyReports(reports);
    
    // Set the current month as selected by default
    if (reports.length > 0 && !selectedMonth) {
      setSelectedMonth(`${reports[0].month} ${reports[0].year}`);
    }
  };

  const getSelectedMonthReport = () => {
    if (!selectedMonth) return null;
    
    const [month, yearStr] = selectedMonth.split(' ');
    const year = parseInt(yearStr);
    
    return monthlyReports.find(report => report.month === month && report.year === year);
  };

  const getMonthPayments = () => {
    if (!selectedMonth) return [];
    
    const [month, yearStr] = selectedMonth.split(' ');
    const year = parseInt(yearStr);
    const monthIndex = new Date(Date.parse(`${month} 1, ${year}`)).getMonth();
    
    let filteredPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      return paymentDate.getFullYear() === year && paymentDate.getMonth() === monthIndex;
    });
    
    // Apply staff filter if selected
    if (selectedStaffId) {
      filteredPayments = filteredPayments.filter(payment => payment.staff_id === selectedStaffId);
    }
    
    return filteredPayments;
  };

  const getFilteredStaff = () => {
    if (!selectedStaffId) return staff;
    return staff.filter(member => member.id === selectedStaffId);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const generatePdfHtml = () => {
    const report = getSelectedMonthReport();
    const monthPayments = getMonthPayments();
    const filteredStaff = getFilteredStaff();
    
    if (!report) return '';
    
    // Create staff table rows
    const staffRows = filteredStaff.map(member => `
      <tr>
        <td>${member.name}</td>
        <td>${member.role}</td>
        <td style="text-align: right;">${formatCurrency(member.base_pay)}</td>
        <td style="text-align: right;">${formatCurrency(member.current_balance)}</td>
      </tr>
    `).join('');
    
    // Create payment table rows
    const paymentRows = monthPayments.map(payment => `
      <tr>
        <td>${payment.staff_name}</td>
        <td>${formatDate(payment.payment_date)}</td>
        <td>${payment.purpose}</td>
        <td style="text-align: right;">${formatCurrency(payment.amount)}</td>
      </tr>
    `).join('');
    
    // Calculate totals for filtered staff
    const filteredTotalSalaries = filteredStaff.reduce((sum, member) => sum + member.base_pay, 0);
    const filteredTotalPayments = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Staff Salary Report - ${selectedMonth}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .subtitle {
            font-size: 16px;
            color: #666;
          }
          .summary {
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .summary-label {
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
          }
          th {
            background-color: #f0f0f0;
            text-align: left;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0 10px 0;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Staff Salary Report</div>
          <div class="subtitle">${selectedMonth}${selectedStaffId ? ' - Filtered by Staff' : ''}</div>
        </div>
        
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Total Staff:</span>
            <span>${filteredStaff.length}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Salaries:</span>
            <span>${formatCurrency(filteredTotalSalaries)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Total Payments:</span>
            <span>${formatCurrency(filteredTotalPayments)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Balance:</span>
            <span>${formatCurrency(filteredTotalSalaries - filteredTotalPayments)}</span>
          </div>
        </div>
        
        <div class="section-title">Staff List</div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th style="text-align: right;">Base Pay</th>
              <th style="text-align: right;">Current Balance</th>
            </tr>
          </thead>
          <tbody>
            ${staffRows}
          </tbody>
        </table>
        
        <div class="section-title">Payments Made (${selectedMonth})</div>
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Date</th>
              <th>Purpose</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRows.length > 0 ? paymentRows : '<tr><td colspan="4" style="text-align: center;">No payments recorded for this month</td></tr>'}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} | everClear Water</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleGeneratePdf = async () => {
    if (!selectedMonth) {
      Alert.alert('Error', 'Please select a month first');
      return;
    }
    
    setGeneratingPdf(true);
    
    try {
      const html = generatePdfHtml();
      
      if (Platform.OS === 'web') {
        // For web, open in a new window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        } else {
          Alert.alert('Error', 'Could not open print window. Please check your popup blocker settings.');
        }
      } else {
        // For native platforms, generate PDF and share
        const { uri } = await Print.printToFileAsync({ html });
        
        if (Platform.OS === 'ios') {
          await Sharing.shareAsync(uri);
        } else {
          // For Android
          const shareResult = await Share.share({
            url: uri,
            title: `Staff Salary Report - ${selectedMonth}.pdf`,
          });
          
          if (shareResult.action === Share.sharedAction) {
            console.log('PDF shared successfully');
          }
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getSelectedStaffName = () => {
    if (!selectedStaffId) return 'All Staff';
    const staffMember = staff.find(member => member.id === selectedStaffId);
    return staffMember ? staffMember.name : 'All Staff';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageTitleBar title="Staff Salary Report" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B7BB0" />
          <Text style={styles.loadingText}>Loading staff data...</Text>
        </View>
      </View>
    );
  }

  const selectedReport = getSelectedMonthReport();
  const monthPayments = getMonthPayments();
  const filteredStaff = getFilteredStaff();

  return (
    <View style={styles.container}>
      <PageTitleBar title="Staff Salary Report" showBack={true} />
      
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Filters Row - Month and Staff in same row */}
        <View style={styles.filtersRow}>
          {/* Month Selector */}
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Select Month:</Text>
            <Pressable 
              style={styles.selector}
              onPress={() => {
                setShowMonthDropdown(!showMonthDropdown);
                if (showStaffDropdown) setShowStaffDropdown(false);
              }}
            >
              <Text style={styles.selectorText}>
                {selectedMonth || 'Select Month'}
              </Text>
              <ChevronDown size={20} color="#2B7BB0" />
            </Pressable>
            
            {showMonthDropdown && monthlyReports.length > 0 && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                  {monthlyReports.map((report, index) => (
                    <Pressable
                      key={index}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setSelectedMonth(`${report.month} ${report.year}`);
                        setShowMonthDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        selectedMonth === `${report.month} ${report.year}` && styles.selectedOptionText
                      ]}>
                        {report.month} {report.year}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          
          {/* Staff Filter */}
          <View style={styles.selectorContainer}>
            <View style={styles.filterHeader}>
              <Text style={styles.selectorLabel}>Filter by Staff:</Text>
              <Filter size={18} color="#2B7BB0" />
            </View>
            <Pressable 
              style={styles.selector}
              onPress={() => {
                setShowStaffDropdown(!showStaffDropdown);
                if (showMonthDropdown) setShowMonthDropdown(false);
              }}
            >
              <Text style={styles.selectorText}>
                {getSelectedStaffName()}
              </Text>
              <ChevronDown size={20} color="#2B7BB0" />
            </Pressable>
            
            {showStaffDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                  <Pressable
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedStaffId(null);
                      setShowStaffDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      selectedStaffId === null && styles.selectedOptionText
                    ]}>
                      All Staff
                    </Text>
                  </Pressable>
                  {staff.map((member) => (
                    <Pressable
                      key={member.id}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setSelectedStaffId(member.id);
                        setShowStaffDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        selectedStaffId === member.id && styles.selectedOptionText
                      ]}>
                        {member.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
        
        {/* Summary Card */}
        {selectedReport && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Calendar size={20} color="#2B7BB0" />
              <Text style={styles.summaryTitle}>
                {selectedMonth} Summary {selectedStaffId ? `(${getSelectedStaffName()})` : ''}
              </Text>
            </View>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Staff</Text>
                <View style={styles.summaryValueContainer}>
                  <User size={16} color="#2B7BB0" />
                  <Text style={styles.summaryValue}>{filteredStaff.length}</Text>
                </View>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Salaries</Text>
                <View style={styles.summaryValueContainer}>
                  <IndianRupee size={16} color="#4CAF50" />
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    {formatCurrency(filteredStaff.reduce((sum, member) => sum + member.base_pay, 0))}
                  </Text>
                </View>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Payments</Text>
                <View style={styles.summaryValueContainer}>
                  <IndianRupee size={16} color="#F44336" />
                  <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                    {formatCurrency(monthPayments.reduce((sum, payment) => sum + payment.amount, 0))}
                  </Text>
                </View>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Balance</Text>
                <View style={styles.summaryValueContainer}>
                  <IndianRupee size={16} color="#FF9800" />
                  <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                    {formatCurrency(
                      filteredStaff.reduce((sum, member) => sum + member.base_pay, 0) - 
                      monthPayments.reduce((sum, payment) => sum + payment.amount, 0)
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        
        {/* Staff List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Staff List {selectedStaffId ? `(${getSelectedStaffName()})` : ''}</Text>
          
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
              <Text style={[styles.headerCell, styles.roleCell]}>Role</Text>
              <Text style={[styles.headerCell, styles.payCell]}>Base Pay</Text>
              <Text style={[styles.headerCell, styles.balanceCell]}>Balance</Text>
            </View>
            
            <ScrollView style={styles.tableBody}>
              {filteredStaff.map((member, index) => (
                <View 
                  key={member.id}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.alternateRow
                  ]}
                >
                  <Text style={[styles.cell, styles.nameCell]}>{member.name}</Text>
                  <Text style={[styles.cell, styles.roleCell]}>{member.role}</Text>
                  <Text style={[styles.cell, styles.payCell]}>{formatCurrency(member.base_pay)}</Text>
                  <Text style={[styles.cell, styles.balanceCell]}>{formatCurrency(member.current_balance)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
        
        {/* Monthly Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Payments Made ({selectedMonth || 'Select a month'})
            {selectedStaffId ? ` - ${getSelectedStaffName()}` : ''}
          </Text>
          
          {monthPayments.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.staffCell]}>Staff</Text>
                <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
                <Text style={[styles.headerCell, styles.purposeCell]}>Purpose</Text>
                <Text style={[styles.headerCell, styles.amountCell]}>Amount</Text>
              </View>
              
              <ScrollView style={styles.tableBody}>
                {monthPayments.map((payment, index) => (
                  <View 
                    key={payment.id}
                    style={[
                      styles.tableRow,
                      index % 2 === 1 && styles.alternateRow
                    ]}
                  >
                    <Text style={[styles.cell, styles.staffCell]}>{payment.staff_name}</Text>
                    <Text style={[styles.cell, styles.dateCell]}>{formatDate(payment.payment_date)}</Text>
                    <Text style={[styles.cell, styles.purposeCell]}>{payment.purpose}</Text>
                    <Text style={[styles.cell, styles.amountCell]}>{formatCurrency(payment.amount)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {selectedMonth 
                  ? 'No payments recorded for this month' 
                  : 'Select a month to view payments'}
              </Text>
            </View>
          )}
        </View>
        
        {/* PDF Generation Button */}
        <Pressable
          style={[styles.pdfButton, generatingPdf && styles.disabledButton]}
          onPress={handleGeneratePdf}
          disabled={generatingPdf || !selectedMonth}
        >
          {generatingPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FileText size={20} color="#fff" />
              <Text style={styles.pdfButtonText}>Generate PDF & Share</Text>
            </>
          )}
        </Pressable>
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    fontFamily: 'AsapCondensed_400Regular',
  },
  // New styles for the filters row
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 1000,
  },
  selectorContainer: {
    width: '48%',
    position: 'relative',
    zIndex: 1000,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectorLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  selectorText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  dropdown: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  selectedOptionText: {
    color: '#2B7BB0',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  summaryValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B7BB0',
    marginLeft: 6,
    fontFamily: 'AsapCondensed_400Regular',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
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
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'AsapCondensed_400Regular',
  },
  tableBody: {
    maxHeight: 300,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alternateRow: {
    backgroundColor: '#f9f9f9',
  },
  cell: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'AsapCondensed_400Regular',
  },
  nameCell: {
    flex: 2,
  },
  roleCell: {
    flex: 1.5,
  },
  payCell: {
    flex: 1.5,
    textAlign: 'right',
  },
  balanceCell: {
    flex: 1.5,
    textAlign: 'right',
  },
  staffCell: {
    flex: 2,
  },
  dateCell: {
    flex: 1.5,
  },
  purposeCell: {
    flex: 2.5,
  },
  amountCell: {
    flex: 1.5,
    textAlign: 'right',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: 'AsapCondensed_400Regular',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'AsapCondensed_400Regular',
  },
  disabledButton: {
    opacity: 0.7,
  }
});