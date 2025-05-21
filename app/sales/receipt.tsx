import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ReceiptItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  product_sn: number;
}

export default function ReceiptViewer() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { saleId } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    customerName: string;
    invoiceNumber: string;
    date: string;
    items: ReceiptItem[];
    total: number;
    isPaid: boolean;
    phoneNumber?: string;
    address?: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (saleId) {
      loadReceiptData(typeof saleId === 'string' ? saleId : saleId[0]);
    } else {
      setError('No sale ID provided');
      setLoading(false);
    }
  }, [saleId]);

  const loadReceiptData = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch sale data
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('*, customer:customers(*)')
        .eq('id', id)
        .single();
        
      if (saleError) throw saleError;
      if (!sale) throw new Error('Sale not found');
      
      // Fetch sale items
      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select('*, product:products(*, product_sn)')
        .eq('sale_id', id);
        
      if (itemsError) throw itemsError;
      
      // Debug: Log all items before filtering
      console.log("Original items before filtering:", JSON.stringify(items));
      
      // Format items with aggressive filtering
      const receiptItems = items
        // First filter - remove problematic items
        .filter(item => {
          // Get values safely
          const price = Number(item.price) || 0;
          const quantity = Number(item.quantity) || 0;
          const totalPrice = Number(item.total_price) || 0;
          
          // Remove any item that has 0 price but non-zero total (this is the specific problem we're seeing)
          if (price === 0 && totalPrice > 0) {
            console.log("Filtering out inconsistent item:", item);
            return false;
          }
          
          // Also filter out any item with zero price or quantity
          if (price <= 0 || quantity <= 0) {
            console.log("Filtering out zero price/quantity item:", item);
            return false;
          }
          
          // Keep the item
          return true;
        })
        // Map to correct format
        .map(item => {
          // Always calculate total from price × quantity to ensure consistency
          const price = Number(item.price) || 0;
          const quantity = Number(item.quantity) || 1;
          const calculatedTotal = price * quantity;
          
          return {
            id: item.id,
            product_name: item.product?.product_name || 'Unknown Product',
            quantity: quantity,
            price: price,
            total: calculatedTotal,
            // Add product_sn for sorting
            product_sn: item.product?.product_sn || 0
          };
        })
        // Sort by product_sn
        .sort((a, b) => {
          // If product_sn is a number, do numerical sorting
          if (!isNaN(Number(a.product_sn)) && !isNaN(Number(b.product_sn))) {
            return Number(a.product_sn) - Number(b.product_sn);
          }
          // Otherwise, do string sorting
          return String(a.product_sn).localeCompare(String(b.product_sn));
        });
      
      // Debug: Log filtered and sorted items
      console.log("Filtered and sorted items:", JSON.stringify(receiptItems));
      
      // Format date
      const date = new Date(sale.created_at);
      const formattedDate = `${date.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()]} ${date.getFullYear()}`;
      
      // Calculate total from filtered items to ensure consistency
      const calculatedTotal = receiptItems.reduce((sum, item) => sum + item.total, 0);
      
      setReceipt({
        customerName: sale.customer?.name || 'Customer',
        invoiceNumber: sale.invoice_number || `INV-${id.substring(0, 8)}`,
        date: formattedDate,
        items: receiptItems,
        // Use calculated total instead of database total
        total: calculatedTotal,
        isPaid: sale.payment_method !== 'credit',
        phoneNumber: sale.customer?.contact_number,
        address: sale.customer?.address || '',
      });
      
    } catch (err: any) {
      console.error('Error loading receipt data:', err);
      setError(err.message || 'Failed to load receipt data');
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = async () => {
    if (!receipt) return;
    
    try {
      setGenerating(true);
      
      const { customerName, invoiceNumber, date, items, total, isPaid, phoneNumber, address } = receipt;
      
      // Filter items one more time, directly in the generate function
      const validItems = items.filter(item => item.price > 0);
      
      // Recalculate total based only on valid items
      const validTotal = validItems.reduce((sum, item) => sum + item.total, 0);
      
      // Create HTML content for the receipt - (Original HTML Structure)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoiceNumber}</title>
          <style>
            @page {
              size: 8in 12in;
              margin: 0;
            }
            body {
              font-family: Arial, sans-serif;
              width: 8in;
              height: 12in;
              padding: 0;
              margin: 0;
            }
            .container {
              padding: 0.3in;
            }
            .header {
              text-align: center;
              margin-bottom: 0.3in;
            }
            .logo {
              max-width: 300px;
              margin: 0 auto;
              display: block;
            }
            .tagline {
              font-size: 20px;
              margin: 6px 0;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              margin: 15px 0;
            }
            .dotted-line {
              border-top: 2px dotted #000;
              margin: 0.2in 0;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
            }
            .left-info {
              text-align: left;
              width: 60%;
              font-size: 22px;
              line-height: 1.4;
            }
            .right-info {
              text-align: right;
              width: 40%;
              font-size: 22px;
              line-height: 1.4;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0.2in 0;
              font-size: 22px;
            }
            th {
              text-align: left;
              font-weight: bold;
              padding: 8px 4px;
            }
            th.price, th.qty, th.total {
              text-align: right;
            }
            td {
              padding: 8px 4px;
            }
            td.price, td.qty, td.total {
              text-align: right;
            }
            .total-row {
              text-align: right;
              font-weight: bold;
              margin: 0.2in 0;
              font-size: 26px;
            }
            .solid-line {
              border-top: 2px solid #000;
              margin: 0.2in 0;
            }
            .payment-section {
              display: flex;
              justify-content: space-between;
            }
            .qr-section {
              text-align: center;
              width: 45%;
            }
            .bank-section {
              text-align: center;
              width: 45%;
            }
            .qr-title {
              font-weight: bold;
              font-size: 24px;
              margin-bottom: 10px;
            }
            .qr-id {
              font-size: 18px;
              margin-bottom: 10px;
            }
            .qr-code {
              width: 160px;
              height: 160px;
            }
            .bank-logo {
              width: 240px;
              height: 100px;
              margin: 0 auto;
              margin-bottom: 10px;
            }
            .bank-name {
              font-weight: bold;
              font-size: 20px;
              margin-bottom: 6px;
            }
            .bank-details {
              font-size: 18px;
              line-height: 1.4;
            }
            .footer {
              text-align: center;
              margin-top: 0.2in;
              font-size: 16px;
              line-height: 1.4;
            }
            .company-name {
              font-weight: bold;
              font-size: 24px;
              margin-bottom: 6px;
            }
            .thanks {
              font-weight: bold;
              font-size: 24px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://iili.io/3Gxh2cB.md.png" alt="everClear" class="logo" />
              <div class="tagline">with added minerals</div>
              <div class="title">CASH INVOICE</div>
            </div>
            
            <div class="dotted-line"></div>
            
            <div class="info-section">
              <div class="left-info">
                <div><strong>To:</strong></div>
                <div>${customerName}</div>
                <div>${phoneNumber}</div>
                <div>${address}</div>
              </div>
              <div class="right-info">
                <div><strong>Invoice No:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${date}</div>
              </div>
            </div>
            
            <div class="dotted-line"></div>
            
            <table>
              <tr>
                <th style="width:8%">SL</th>
                <th style="width:32%">Description</th>
                <th class="price" style="width:20%">Price</th>
                <th class="qty" style="width:15%">Qty</th>
                <th class="total" style="width:25%">Total</th>
              </tr>
              ${validItems.map((item, index) => {
                let displayName = item.product_name;
                if (displayName.includes('500ml')) displayName = '500ml';
                else if (displayName.includes('250ml')) displayName = '250ml';
                else if (displayName.includes('1L') || displayName.includes('1000ml')) displayName = '1000ml';
                else if (displayName.includes('20L')) displayName = '20L';
                
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${displayName}</td>
                    <td class="price">₹${item.price.toFixed(2)}</td>
                    <td class="qty">${item.quantity}</td>
                    <td class="total">₹${item.total.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </table>
            
            <div class="dotted-line"></div>
            
            <div class="total-row">
              TOTAL: ₹${validTotal.toFixed(2)}
            </div>
            
            <div class="solid-line"></div>
            
            <div class="payment-section">
              <div class="qr-section">
                <div class="qr-title">UPI</div>
                <div class="qr-id">UPI ID: fdaizawl-1@okaxis</div>
                <img src="https://iili.io/3MJzYsp.md.png" class="qr-code" />
              </div>
              <div class="bank-section">
                <img src="https://iili.io/3EL0Yxf.png" class="bank-logo" />
                <div class="bank-name">FRANKIE LALLAWMSANGA</div>
                <div class="bank-details">AC no: 50200043295332</div>
                <div class="bank-details">IFSC: HDFC0004728</div>
              </div>
            </div>
            
            <div class="solid-line"></div>
            
            <div class="footer">
              <div class="company-name">everClear</div>
              <div>Mission Vengthlang, Aizawl - 796005, Mizoram</div>
              <div class="thanks">Thank you for your Business!</div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      // Create a better filename using the invoice number format
      // Replace any invalid characters for filenames
      const safeInvoiceNumber = invoiceNumber.replace(/[\/\\:*?"<>|]/g, '-');
      const fileName = `${safeInvoiceNumber}.pdf`;
      let newUri = uri;
      
      // Only rename the file for native platforms, not web
      if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
        newUri = `${FileSystem.documentDirectory}${fileName}`;
        
        // Move/rename the file
        try {
          await FileSystem.moveAsync({
            from: uri,
            to: newUri
          });
          console.log(`PDF renamed to: ${fileName}`);
        } catch (err) {
          console.error('Error renaming file:', err);
          newUri = uri; // Fallback to original uri if renaming fails
        }
      }
      
      // Share the generated PDF
      if (Platform.OS === 'web') {
        // For web, use Print API to view/download the PDF
        await Print.printAsync({ html: htmlContent });
      } else {
        try {
          // Check if sharing is available (required for iOS)
          const isAvailable = await Sharing.isAvailableAsync();
          
          if (isAvailable) {
            // Use Expo Sharing for native platforms
            await Sharing.shareAsync(newUri, {
              mimeType: 'application/pdf',
              dialogTitle: `Invoice ${invoiceNumber}`,
              UTI: 'com.adobe.pdf' // iOS UTI
            });
          } else {
            // Fallback to React Native Share API
            await Share.share({
              url: newUri,
              title: `Invoice ${invoiceNumber}`
            });
          }
        } catch (shareError) {
          console.error('Error sharing:', shareError);
          Alert.alert('Share Failed', 'Could not share the PDF. The file is available at: ' + newUri);
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF receipt');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.message}>Loading receipt...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No receipt data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.logo}></Text>
          <Text style={styles.tagline}></Text>
          <Text style={styles.title}>CASH INVOICE</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.infoContainer}>
          <View style={styles.leftInfo}>
            <Text style={styles.infoLabel}>To:</Text>
            <Text style={styles.infoText}>{receipt.customerName}</Text>
            <Text style={styles.infoText}>{receipt.phoneNumber}</Text>
            <Text style={styles.infoText}>{receipt.address}</Text>
          </View>
          <View style={styles.rightInfo}>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Invoice No: </Text>
              {receipt.invoiceNumber}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Date: </Text>
              {receipt.date}
            </Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.slColumn]}>SL</Text>
            <Text style={[styles.headerCell, styles.descColumn]}>Description</Text>
            <Text style={[styles.headerCell, styles.priceColumn]}>Price</Text>
            <Text style={[styles.headerCell, styles.qtyColumn]}>Qty</Text>
            <Text style={[styles.headerCell, styles.totalColumn]}>Total</Text>
          </View>
          
          {receipt.items.map((item, index) => {
            let displayName = item.product_name;
            if (displayName.includes('500ml')) displayName = '500ml';
            else if (displayName.includes('250ml')) displayName = '250ml';
            else if (displayName.includes('1L') || displayName.includes('1000ml')) displayName = '1000ml';
            else if (displayName.includes('20L')) displayName = '20L';
            
            return (
              <View key={item.id || index} style={styles.tableRow}>
                <Text style={[styles.cell, styles.slColumn]}>{index + 1}</Text>
                <Text style={[styles.cell, styles.descColumn]}>{displayName}</Text>
                <Text style={[styles.cell, styles.priceColumn]}>₹{item.price.toFixed(2)}</Text>
                <Text style={[styles.cell, styles.qtyColumn]}>{item.quantity}</Text>
                <Text style={[styles.cell, styles.totalColumn]}>₹{item.total.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>TOTAL: ₹{receipt.total.toFixed(2)}</Text>
        </View>
        
        <View style={styles.solidDivider} />
        
        <TouchableOpacity style={styles.button} onPress={generatePdf} disabled={generating}>
          <View style={styles.buttonContent}>
            <FontAwesome name="file-pdf-o" size={26} color="#FF0000" style={{ marginRight: 12 }} />
          <Text style={styles.buttonText}>
            {generating ? 'Generating PDF...' : 'Generate & Share Receipt'}
          </Text>
            <FontAwesome name="whatsapp" size={30} color="#25d366" style={{ marginLeft: 12 }} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {generating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2B7BB0" />
            <Text style={styles.loadingText}>Generating PDF...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    fontSize: 26,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  tagline: {
    fontSize: 12,
    marginVertical: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  solidDivider: {
    height: 1,
    backgroundColor: '#000',
    marginVertical: 15,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  leftInfo: {
    flex: 3,
  },
  rightInfo: {
    flex: 2,
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
  },
  tableContainer: {
    marginVertical: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerCell: {
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cell: {
    fontSize: 14,
  },
  slColumn: {
    width: '10%',
    textAlign: 'center',
  },
  descColumn: {
    width: '40%',
  },
  priceColumn: {
    width: '20%',
    textAlign: 'right',
  },
  qtyColumn: {
    width: '10%',
    textAlign: 'center',
  },
  totalColumn: {
    width: '20%',
    textAlign: 'right',
  },
  totalRow: {
    alignSelf: 'flex-end',
    marginVertical: 10,
  },
  totalText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  message: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  errorMessage: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: 'red',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
}); 