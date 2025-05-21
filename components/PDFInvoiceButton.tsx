import React from 'react';
import { Pressable, Text, StyleSheet, View, ActivityIndicator, Alert, Image } from 'react-native';
import { generateInvoicePDF } from '@/app/utils/pdfGenerator';

interface PDFInvoiceButtonProps {
  invoiceData: {
    invoiceNo: string;
    date: string;
    customerName: string;
    customerAddress: string;
    vehicleNo?: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
      product_name?: string;
      size?: string;
    }>;
    subtotal: number;
    tax: number;
    total: number;
  };
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  totalAmount?: number; // For cases with no itemized details
}

export default function PDFInvoiceButton({ 
  invoiceData, 
  variant = 'primary', 
  disabled = false,
  totalAmount 
}: PDFInvoiceButtonProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGeneratePDF = async () => {
    if (disabled || isGenerating) return;
    
    try {
      // Validate the invoice data before proceeding
      console.log("[PDFInvoiceButton] Generating PDF with invoice data:", JSON.stringify(invoiceData, null, 2));
      
      if (!invoiceData) {
        console.error("[PDFInvoiceButton] Invoice data is null or undefined");
        
        // If we have a totalAmount but no invoice data, create a simple invoice
        if (totalAmount) {
          console.log("[PDFInvoiceButton] Creating simple invoice with total amount:", totalAmount);
          
          const simpleInvoice = {
            invoiceNo: 'INV-' + Date.now().toString().substring(0, 8),
            date: new Date().toLocaleDateString(),
            customerName: 'Customer',
            customerAddress: 'No Address Provided',
            items: [{
              name: 'Water Bottle',
              quantity: 1,
              price: totalAmount,
              total: totalAmount
            }],
            subtotal: totalAmount,
            tax: 0,
            total: totalAmount
          };
          
          setIsGenerating(true);
          await generateInvoicePDF(simpleInvoice);
          return;
        }
        
        Alert.alert("Error", "Invoice data is missing. Please try again.");
        return;
      }
      
      if (!invoiceData.items || invoiceData.items.length === 0) {
        console.error("[PDFInvoiceButton] No items in invoice data");
        
        // If no items but we have a total amount, create a placeholder item
        const invoiceTotal = totalAmount || invoiceData.total;
        if (invoiceTotal > 0) {
          console.log("[PDFInvoiceButton] No items found, creating placeholder with total:", invoiceTotal);
          
          // Create a modified invoice with a placeholder item
          const modifiedInvoice = {
            ...invoiceData,
            items: [{
              name: 'Water Bottle',
              quantity: 1,
              price: invoiceTotal,
              total: invoiceTotal
            }],
            subtotal: invoiceTotal,
            total: invoiceTotal
          };
          
          setIsGenerating(true);
          await generateInvoicePDF(modifiedInvoice);
          return;
        }
        
        Alert.alert("Error", "No items found for this invoice. Please try again.");
        return;
      }
      
      // Deep fix the invoice data - fix ALL potential issues
      const fixedInvoiceData = {
        ...invoiceData,
        // Ensure we have a valid invoice number
        invoiceNo: invoiceData.invoiceNo || 'INV-' + Date.now().toString().substring(0, 8),
        // Ensure customer name is valid
        customerName: invoiceData.customerName || 'Customer',
        // Ensure address is valid
        customerAddress: invoiceData.customerAddress || 'No Address Provided',
        // Fix total amounts
        subtotal: invoiceData.subtotal || 0,
        tax: invoiceData.tax || 0,
        total: invoiceData.total || 0,
        
        // Fix each item in the items array
        items: invoiceData.items.map(item => {
          // Calculate price from total if price is zero
          const quantity = item.quantity || 1;
          let price = item.price;
          let total = item.total;
          
          // Log the raw data first
          console.log("[PDFInvoiceButton] Raw item data:", { 
            name: item.name, 
            quantity, 
            price, 
            total, 
            product_name: item.product_name 
          });
          
          // Check if totals are being incorrectly assigned to price
          // This happens when price is the same as total which is unlikely for quantity > 1
          if (price === total && quantity > 0) {
            console.log("[PDFInvoiceButton] Detected price equals total, fixing...");
            price = total / quantity;
          }
          
          // If we have a zero price but a valid total, calculate the price
          if ((!price || price <= 0) && total && total > 0) {
            console.log("[PDFInvoiceButton] Zero price with valid total, calculating price");
            price = total / quantity;
          } 
          // If we have a zero total but valid price, calculate the total
          else if ((!total || total <= 0) && price && price > 0) {
            console.log("[PDFInvoiceButton] Zero total with valid price, calculating total");
            total = price * quantity;
          }
          // If both are zero, set some reasonable defaults (shouldn't happen)
          else if ((!price || price <= 0) && (!total || total <= 0)) {
            console.log("[PDFInvoiceButton] Both price and total invalid, using defaults");
            price = 100; // Default price
            total = price * quantity;
          }
          
          // For sanity check - make sure price * quantity roughly equals total (allowing for rounding)
          if (Math.abs((price * quantity) - total) > 1) {
            console.log("[PDFInvoiceButton] Price-quantity-total mismatch, fixing...");
            // If there's a mismatch, prioritize the total and recalculate price
            price = total / quantity;
          }
          
          console.log("[PDFInvoiceButton] Fixed item data:", { 
            name: item.name || item.product_name || 'Water', 
            quantity, 
            price, 
            total 
          });
          
          return {
            ...item,
            name: item.name || item.product_name || 'Water',
            quantity,
            price,
            total
          };
        })
      };
      
      // Recalculate the total based on fixed items
      fixedInvoiceData.subtotal = fixedInvoiceData.items.reduce((sum, item) => sum + item.total, 0);
      fixedInvoiceData.total = fixedInvoiceData.subtotal + fixedInvoiceData.tax;
      
      console.log("[PDFInvoiceButton] Using fixed invoice data:", JSON.stringify(fixedInvoiceData, null, 2));
      
      setIsGenerating(true);
      await generateInvoicePDF(fixedInvoiceData);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      Alert.alert("Error", "Failed to generate invoice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled
      ]}
      onPress={handleGeneratePDF}
      disabled={disabled || isGenerating}
    >
      {isGenerating ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <View style={styles.buttonContent}>
          {/* PDF Icon from image */}
          <Image 
            source={require('@/assets/images/pdf-icon.png')} 
            style={styles.pdfIcon}
            defaultSource={require('@/assets/images/pdf-icon.png')}
          />
          <Text style={[
            styles.buttonText,
            variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText
          ]}>
            Invoice
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  primaryButton: {
    backgroundColor: '#e53935', // Red color to match PDF icon
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e53935', // Red color to match PDF icon
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    marginLeft: 6,
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#e53935', // Red color to match PDF icon
  },
  pdfIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  }
}); 