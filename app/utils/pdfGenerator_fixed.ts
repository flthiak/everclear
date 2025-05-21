import * as Print from 'expo-print';
import { Platform, Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

// UPI Logo base64 (this will be used inline in the HTML)
const UPI_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAPCAMAAABEF/i0AAAAllBMVEUAAADZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dkbOLTMAAAAMXRSTlMA+AXo17f1r6iIcWBQSBcH/vTy7t3Jw7mvlpF7ZmNaUUpGMC8rJiMZEQ7i0ryej4Vk8B4q+AAAAPdJREFUKM+F0teSwyAMRdEr2XKRE6f3vv//d0tmJgNexM56WDAwF0mlRpKG1/z6LcMPtH4ldSgVIwPqkFqkYqRCHVKDVIwUqEOqkYqRDHVIFVIxEqEOqUQqRgLUIRVIxYiHOqQcqRhxUIfk/jtxUIfkSMWIhTokQypGDNQhKVIxoqEOSZCKEQV1SIxUjEioQ0KkYoRDHRIgFSMM6hAfqRghUId4SMXwhjrEQSqGF9QhFlIxPKAOsZCKYUMdYiAVw4I6xEAqhgl1iI5UDBPqEB2pGAbUIRpSMXSoQ1SkYmhQh6hIxVChDlGQiqFAHaIgFUOBOkRBKoYCdYiCVIwfqEM+SMX4AXXIm1SMX7Cn/PJ4VbWCAAAAAElFTkSuQmCC';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  product_name?: string;
  size?: string;
}

interface InvoiceData {
  invoiceNo: string;
  date: string;
  customerName: string;
  customerAddress: string;
  vehicleNo?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  logoUri1?: string;
  logoUri2?: string;
  upiLogo?: string;
  payment_method?: string;
}

export const generateInvoicePDF = async (data: InvoiceData): Promise<boolean> => {
  try {
    console.log('[pdfGenerator] Generating PDF with data:', JSON.stringify(data, null, 2));
    
    // Load local assets if not provided in the data
    if (!data.logoUri1 || !data.logoUri2) {
      console.log('[pdfGenerator] Loading local assets');
      try {
        const logoAsset1 = Asset.fromModule(require('@/assets/images/ec_invoice.png'));
        const logoAsset2 = Asset.fromModule(require('@/assets/images/qrcode.png'));
      
        await Promise.all([logoAsset1.downloadAsync(), logoAsset2.downloadAsync()]);
      
        if (!data.logoUri1) {
          data.logoUri1 = logoAsset1.localUri || logoAsset1.uri;
          console.log('[pdfGenerator] Logo 1 loaded from local assets:', data.logoUri1);
        }
        
        if (!data.logoUri2) {
          data.logoUri2 = logoAsset2.localUri || logoAsset2.uri;
          console.log('[pdfGenerator] Logo 2 loaded from local assets:', data.logoUri2);
        }
      } catch (assetError) {
        console.error('[pdfGenerator] Error loading local assets:', assetError);
        // Fall back to remote URLs if asset loading fails
        if (!data.logoUri1) {
          data.logoUri1 = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ec_invoice-OYrIvJ1kYik4MLEv62LL0Zc0hoqRZ0.png";
        }
        
        if (!data.logoUri2) {
          data.logoUri2 = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/vlh-uL3lOiItsqphWPNcyiZHn3ZHbZNEoW.png";
        }
      }
    }
    
    // Use provided UPI logo or fallback to the constant
    if (!data.upiLogo) {
      data.upiLogo = UPI_LOGO;
    }
    
    // Format the date parts (day/month/year)
    const dateParts = data.date.split('/');
    let day = dateParts[0] || '';
    let month = dateParts[1] || '';
    let year = dateParts[2] || '';
    
    if (year.length > 2) {
      year = year.substring(2); // Keep only the last 2 digits if it's a full year
    }
    
    // Format vehicle number if provided
    const vehicleNo = data.vehicleNo || '';
    
    // Generate table rows for items
    let itemRows = '';
    data.items.forEach((item, index) => {
      // Ensure item.name exists, or create it from product_name and size
      const itemName = item.name || `${item.product_name || 'Water'} ${item.size || ''}`;
      
      itemRows += `
        <tr>
          <td>${index + 1}</td>
          <td>${itemName}</td>
          <td>â‚¹${item.price.toFixed(2)}</td>
          <td>${item.quantity}</td>
          <td>â‚¹${item.total.toFixed(2)}</td>
        </tr>
      `;
    });
    
    // Add empty rows to fill up the table if needed (only if we have less than 6 items)
    const fillerRows = Math.max(0, 6 - data.items.length);
    for (let i = 0; i < fillerRows; i++) {
      itemRows += `
        <tr>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      `;
    }
    
    // Format the total amount
    const totalAmount = data.total.toFixed(2);
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>EverClear Invoice</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
              
              body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 20px;
                  box-sizing: border-box;
                  max-width: 800px;
                  margin: 0 auto;
              }
              
              .invoice-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 20px;
              }
              
              .logo-container {
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start;
              }
              
              .logo {
                  max-width: 250px;
                  height: auto;
              }
              
              .tagline {
                  font-size: 14px;
                  margin-top: -10px;
                  margin-left: 40px;
              }
              
              .invoice-title {
                  text-align: right;
              }
              
              .invoice-title h1 {
                  font-size: 38px;
                  margin: 0;
                  font-weight: bold;
              }
              
              .cash-label {
                  text-decoration: underline;
                  font-weight: bold;
                  font-size: 18px;
                  text-align: right;
                  margin-bottom: 5px;
              }
              
              .info-container {
                  display: flex;
                  margin-bottom: 20px;
                  gap: 20px; /* Added gap between the two sections */
              }
              
              .to-section, .invoice-details {
                  border: 0.5px solid #c5c5c5;
                  padding: 10px;
                  box-sizing: border-box;
                  border-radius: 10px; /* Added rounded corners */
                  overflow: hidden; /* Ensures content doesn't overflow rounded corners */
              }
              
              .to-section {
                  width: 50%;
                  height: 150px;
              }
              
              .invoice-details {
                  width: 50%;
                  display: flex;
                  flex-direction: column;
              }
              
              .invoice-details > div {
                  padding: 10px;
                  border-bottom: 1px solid #c5c5c5;
                  flex: 1;
              }
              
              .invoice-details > div:last-child {
                  border-bottom: none;
              }
              
              .invoice-table {
                  width: 100%;
                  border-collapse: separate; /* Changed from collapse to separate for border-radius */
                  border-spacing: 0; /* Ensures no gaps between cells */
                  margin-bottom: 20px;
                  border: 1px solid #c5c5c5;
                  border-radius: 10px; /* Added rounded corners */
                  overflow: hidden; /* Ensures content doesn't overflow rounded corners */
              }
              
              .invoice-table th, .invoice-table td {
                  border: 0.4px solid #c5c5c5;
                  padding: 6px;
                  text-align: left;
              }
              
              /* Remove double borders between cells */
              .invoice-table th:not(:last-child), 
              .invoice-table td:not(:last-child) {
                  border-right: none;
              }
              
              .invoice-table tr:not(:last-child) th,
              .invoice-table tr:not(:last-child) td {
                  border-bottom: none;
              }
              
              .invoice-table th {
                  background-color: #f2f2f2;
              }
              
              .sl-column {
                  width: 40px;
              }
              
              .price-column, .quantity-column, .total-column {
                  width: 15%;
              }
              
              .footer-container {
                  display: flex;
                  margin-bottom: 20px;
                  gap: 20px; /* Added gap between footer sections */
              }
              
              .qr-section, .bank-section, .signature-section {
                  width: 33.33%;
                  border: 1px solid #c5c5c5;
                  padding: 10px;
                  box-sizing: border-box;
                  border-radius: 10px; /* Added rounded corners */
                  align-items: center;
              }
              
              .qr-section {
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  text-align: center;
              }
              
              .qr-code {
                  width: 100px;
                  height: 100px;
                  border-radius: 5px; /* Slightly rounded corners for QR code */
                  margin: 0 auto;
              }
              
              .upi-logo {
                  width: 100px;
                  height: auto;
                  margin-top: 10px;
              }
              
              .bank-section {
                  text-align: center;
              }
              
              .bank-icons {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  margin-bottom: 10px;
              }
              
              .bank-icon {
                  width: 30px;
                  height: 30px;
                  margin: 0 5px;
              }
              
              .neft-rtgs {
                  color: #0099cc;
                  font-weight: bold;
                  font-size: 12px;
              }
              
              .signature-section {
                  text-align: center;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  font-size: 12px;
              }
              
              .total-row {
                  display: flex;
                  justify-content: space-between;
                  border: 1px solid #c5c5c5;
                  padding: 10px;
                  margin-bottom: 20px;
                  font-weight: bold;
                  border-radius: 10px; /* Added rounded corners */
                  background-color: #f1f1f1;
              }
              
              .address {
                  text-align: center;
                  border: 1px solid #c5c5c5;
                  padding: 10px;
                  margin-bottom: 20px;
                  border-radius: 10px; /* Added rounded corners */
              }
              
              .thank-you {
                  text-align: center;
                  border: 1px;
                  padding: 10px;
                  border-radius: 10px; /* Added rounded corners */
                  font-weight: bold;
              }
              
              .date-format {
                  display: inline-block;
                  align-items: center;
                  white-space: nowrap;
                  font-family: monospace;
                  font-size: 14px;
                  letter-spacing: 1px;
                  margin-left: 8px;
              }
              
              @media print {
                  body {
                      print-color-adjust: exact;
                      -webkit-print-color-adjust: exact;
                  }
                  button {
                      display: none;
                  }
              }
          </style>
      </head>
      <body>
          <div class="invoice-header">
              <div class="logo-container">
                  <img src="${data.logoUri1}" alt="everClear Logo" class="logo">
                  <div class="tagline">with added minerals</div>
              </div>
              <div class="invoice-title">
                  <div class="cash-label">CASH</div>
                  <h1>INVOICE</h1>
              </div>
          </div>
          
          <div class="info-container">
              <div class="to-section">
                  <strong>To,</strong>
                  <p>${data.customerName}</p>
                  <p>${data.customerAddress}</p>
              </div>
              <div class="invoice-details">
                  <div><strong>Invoice No:</strong> ${data.invoiceNo}</div>
                  <div style="display: flex; align-items: center;">
                    <strong>Date:</strong>
                    <span class="date-format">${data.date}</span>
                  </div>
                  <div><strong>Vehicle No:</strong> ${vehicleNo || '-'}</div>
              </div>
          </div>
          
          <table class="invoice-table">
              <thead>
                  <tr>
                      <th class="sl-column">SL</th>
                      <th>Description</th>
                      <th class="price-column">Price</th>
                      <th class="quantity-column">Quantity</th>
                      <th class="total-column">Total</th>
                  </tr>
              </thead>
              <tbody>
                  ${itemRows}
              </tbody>
          </table>
          
          <div class="total-row">
              <div><strong>TOTAL:</strong></div>
              <div><strong>â‚¹${totalAmount}</strong></div>
          </div>
          
          <div class="footer-container">
              <div class="qr-section">
                  <img src="${data.logoUri2}" alt="QR Code" class="qr-code">
                  <div>
                      <img src="${data.upiLogo}" alt="UPI Logo" class="upi-logo">
                  </div>
              </div>
              <div class="bank-section">
                  <div class="bank-icons">
                      <span style="font-size: 24px;">ðŸ›ï¸</span>
                      <span class="neft-rtgs">NEFT RTGS</span>
                      <span style="font-size: 24px;">ðŸ›ï¸</span>
                  </div>
                  <div style="text-align: center; border-top: 1px solid #c5c5c5; padding-top: 5px;">
                      <strong>FRANKIE LALLAWMSANGA</strong><br>
                      AC no: 50200043295332<br>
                      IFSC: HDFC0004728
                  </div>
              </div>
              <div class="signature-section">
                  <div>for VLH INDUSTRIES</div>
                  <div style="margin-top: 50px;"><b>AUTHORISED SIGNATORY</b></div>
              </div>
          </div>
          
          <div class="address">
              VLH INDUSTRIES A2/39 Mission Vengthlang, Aizawl - 796005, Mizoram
          </div>
          
          <div class="thank-you">
              Thank you for your Business!!
          </div>
          
          ${Platform.OS === 'web' ? '<button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Print Invoice</button>' : ''}
      </body>
      </html>
    `;
    
    console.log('[pdfGenerator] HTML content created');
    
    // Handle PDF generation based on platform
    if (Platform.OS === 'web') {
      // Web platform approach
      console.log('[pdfGenerator] Web platform detected, trying browser print');
      try {
        // Create a new window with the HTML content
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          
          // Try to print the window
          setTimeout(() => {
            try {
              printWindow.print();
              console.log('[pdfGenerator] Browser print initiated');
              return true;
            } catch (error) {
              console.log('[pdfGenerator] Failed to open print window, falling back to printAsync');
              printWindow.close();
              throw error;
            }
          }, 500);
        }
      } catch (error) {
        // Fallback to expo-print's printAsync
        await Print.printAsync({ html: htmlContent });
      }
      console.log('[pdfGenerator] Web platform detected');
      return true;
    } else {
      // Mobile platform approach
      try {
        console.log('[pdfGenerator] Attempting direct printing first');
        try {
          // Try direct print first if available
          const { uri } = await Print.printToFileAsync({ html: htmlContent });
          if (uri) {
            console.log('[pdfGenerator] Direct printing successful');
            return await shareFile(uri);
          }
        } catch (printError) {
          console.warn('[pdfGenerator] Direct printing failed, falling back to file-based approach:', printError);
        }
        
        // Create PDF file
        console.log('[pdfGenerator] Creating PDF file');
        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false
        });
        
        console.log('[pdfGenerator] PDF file created at:', uri);
        
        return await shareFile(uri);
      } catch (error) {
        console.error('[pdfGenerator] Error generating PDF:', error);
        Alert.alert('Error', 'Failed to generate invoice PDF.');
        return false;
      }
    }
  } catch (error) {
    console.error('[pdfGenerator] Error generating PDF:', error);
    Alert.alert('Error', 'Failed to generate invoice PDF.');
    return false;
  }
};

// Helper function to share the PDF file
const shareFile = async (uri: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      console.log('[pdfGenerator] Sharing on iOS');
      await Sharing.shareAsync(uri);
    } else if (Platform.OS === 'android') {
      console.log('[pdfGenerator] Sharing on Android');
      // On Android, we need to copy the file to a shared location
      const fileName = `invoice_${Date.now()}.pdf`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      
      console.log('[pdfGenerator] Copying from', uri, 'to', filePath);
      await FileSystem.copyAsync({
        from: uri,
        to: filePath
      });
      
      console.log('[pdfGenerator] Sharing file:', filePath);
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/pdf',
        dialogTitle: 'View your invoice',
        UTI: 'com.adobe.pdf'
      });
    } else {
      console.log('[pdfGenerator] Web platform detected');
      // Web platform - already handled in the main function
    }
    
    console.log('[pdfGenerator] PDF shared successfully');
    return true;
  } catch (error) {
    console.error('[pdfGenerator] Error sharing PDF:', error);
    Alert.alert('Error', 'Failed to share invoice PDF.');
    return false;
  }
};
