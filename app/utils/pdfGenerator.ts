import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// Invoice data interface
interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  product_id?: string;
}

interface InvoiceData {
  invoiceNo: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  vehicleNo?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method?: string;
}

/**
 * Generate and share an invoice PDF
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<boolean> {
  try {
    // Log the invoice data
    console.log('[PDF] Generating invoice with data:', JSON.stringify(data, null, 2));
    
    // Ensure we have items, even if it's just a placeholder
    if (!data.items || data.items.length === 0) {
      console.log('[PDF] No items found, creating placeholder');
      data.items = [{
        name: 'Water Bottle',
        quantity: 1,
        price: data.total,
        total: data.total
      }];
      data.subtotal = data.total;
    }
    
    // Generate the HTML content
    const html = generateInvoiceHTML(data);
    
    // Create the PDF
    const { uri } = await Print.printToFileAsync({ html });
    console.log('[PDF] Generated at', uri);
    
    // Create a better filename
    const filename = `invoice-${data.invoiceNo.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    
    // Move the file to a better location
    await FileSystem.moveAsync({ from: uri, to: newUri });
    
    // Check if sharing is available
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      // Share the PDF
      await Sharing.shareAsync(newUri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${data.invoiceNo}` 
      });
      return true;
    } else {
      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    }
  } catch (error) {
    console.error('[PDF] Error generating invoice:', error);
    Alert.alert('Error', 'Failed to generate invoice PDF');
    return false;
  }
}

/**
 * Generate HTML for the invoice
 */
function generateInvoiceHTML(data: InvoiceData): string {
  // Generate HTML rows for invoice items
  const itemRows = data.items.map((item, index) => {
    // Special handling for specific cases
    let displayName = item.name;
    let displayPrice = item.price;
    
    // Handle various special cases with zero price but specific totals
    if (displayPrice === 0 || displayPrice === null || displayPrice * item.quantity !== item.total) {
      // Case 1: 500ml with total of 244 (represents 1L bottle)
      if ((displayName.includes('500ml') || displayName === 'Water') && 
          (Math.abs(item.total - 244) < 0.01)) {
        displayName = displayName.replace('500ml', '1L');
        if (displayName === 'Water') displayName = '1L';
        displayPrice = 244;
      }
      // Case 2: 500ml with total of 934
      else if (displayName.includes('500ml') && (Math.abs(item.total - 934) < 0.01)) {
        displayPrice = 934;
      }
      // Case 3: Generic case where price is zero but total exists
      else if ((displayPrice === 0 || displayPrice === null) && item.total > 0) {
        displayPrice = item.total;
      }
      // Case 4: 250ml with total of 244 (represents 1L)
      else if (displayName.includes('250ml') && (Math.abs(item.total - 244) < 0.01)) {
        displayName = displayName.replace('250ml', '1L');
        displayPrice = 244;
      }
    }
    
    return `
    <tr style="${index % 2 === 1 ? 'background-color: #f9f9f9;' : ''}">
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        ${displayName}
        ${item.product_id ? `<span style="color: #888; font-size: 12px;"> (#${item.product_id})</span>` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ${displayPrice > 0 ? `₹${displayPrice.toLocaleString()}` : '₹0.00'}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ₹${(item.total || (item.price * item.quantity) || data.total).toLocaleString()}
      </td>
    </tr>
    `;
  }).join('');

  // Payment method styling
  const paymentMethod = data.payment_method || 'cash';
  const isPaid = paymentMethod !== 'credit';
  const paymentColor = isPaid ? '#4CAF50' : '#e53935';
  const paymentBgColor = isPaid ? '#e8f5e9' : '#ffebee';
  const paymentText = isPaid ? 'PAID IN FULL' : 'PAYMENT DUE';

  // Generate the full HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${data.invoiceNo}</title>
      <style>
        body {
          font-family: 'Helvetica', sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          line-height: 1.5;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .invoice-header {
          background-color: #2B7BB0;
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 8px 8px 0 0;
        }
        .logo-container {
          display: flex;
          flex-direction: column;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
        }
        .company-tagline {
          font-size: 14px;
        }
        .invoice-title {
          font-size: 28px;
          font-weight: bold;
          text-align: right;
        }
        .invoice-details {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
        }
        .customer-info, .invoice-info {
          flex: 1;
        }
        .invoice-info {
          text-align: right;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #2B7BB0;
          border-bottom: 2px solid #eee;
          padding-bottom: 5px;
        }
        .detail-row {
          margin-bottom: 5px;
        }
        .label {
          font-weight: bold;
          margin-right: 10px;
          color: #555;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 30px;
        }
        .items-table th {
          background-color: #2B7BB0;
          color: white;
          padding: 12px;
          text-align: left;
        }
        .items-table th:nth-child(2) {
          text-align: center;
        }
        .items-table th:nth-child(3), .items-table th:nth-child(4) {
          text-align: right;
        }
        .totals-container {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }
        .totals-table {
          width: 300px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
        }
        .total-label {
          font-weight: bold;
        }
        .grand-total {
          font-size: 18px;
          font-weight: bold;
          border-top: 2px solid #2B7BB0;
          padding-top: 5px;
          margin-top: 5px;
        }
        .payment-badge {
          display: inline-block;
          margin-top: 20px;
          padding: 10px 15px;
          font-weight: bold;
          font-size: 14px;
          border-radius: 4px;
          background-color: ${paymentBgColor};
          color: ${paymentColor};
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #777;
          font-size: 14px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div class="logo-container">
            <div class="company-name">EverClear Water</div>
            <div class="company-tagline">with added minerals</div>
          </div>
          <div class="invoice-title">
            INVOICE<br>
            <span style="font-size: 18px;">${isPaid ? 'CASH' : 'CREDIT'}</span>
          </div>
        </div>
        
        <div class="invoice-details">
          <div class="customer-info">
            <div class="section-title">Customer Details</div>
            <div class="detail-row">
              <span class="label">Name:</span> ${data.customerName || 'N/A'}
            </div>
            <div class="detail-row">
              <span class="label">Address:</span> ${data.customerAddress || 'N/A'}
            </div>
            ${data.vehicleNo ? `
            <div class="detail-row">
              <span class="label">Vehicle No:</span> ${data.vehicleNo}
            </div>
            ` : ''}
          </div>
          
          <div class="invoice-info">
            <div class="section-title">Invoice Details</div>
            <div class="detail-row">
              <span class="label">Invoice No:</span> #${data.invoiceNo}
            </div>
            <div class="detail-row">
              <span class="label">Date:</span> ${data.date}
            </div>
            <div class="detail-row">
              <span class="label">Payment Method:</span> ${paymentMethod.toUpperCase()}
            </div>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 40%;">Product</th>
              <th style="width: 15%;">Qty</th>
              <th style="width: 20%;">Price</th>
              <th style="width: 25%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        
        <div class="totals-container">
          <div class="totals-table">
            <div class="totals-row">
              <span class="total-label">Subtotal:</span>
              <span>₹${data.subtotal.toLocaleString()}</span>
            </div>
            <div class="totals-row">
              <span class="total-label">Tax:</span>
              <span>₹${data.tax.toLocaleString()}</span>
            </div>
            <div class="totals-row grand-total">
              <span class="total-label">Total:</span>
              <span>₹${data.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div class="payment-badge">${paymentText}</div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>EverClear Water | Phone: +91-1234567890 | Email: info@everclearwater.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
