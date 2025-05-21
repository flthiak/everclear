import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Define the interface for invoice items
interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

// Define the interface for invoice data
export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  total: number;
  isPaid: boolean;
}

/**
 * Generate a simple invoice PDF
 */
export const generateSimpleInvoice = async (data: InvoiceData): Promise<string> => {
  try {
    console.log("Starting simple invoice PDF generation");
    
    // Ensure data is available
    const invoiceData = {
      ...data,
      customerPhone: data.customerPhone || '',
      customerAddress: data.customerAddress || '',
      invoiceDate: data.invoiceDate || new Date().toLocaleDateString('en-IN')
    };

    // Generate item rows
    const itemRows = invoiceData.items.map((item, index) => {
      const total = item.total || (item.price * item.quantity);
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>₹${item.price.toLocaleString()}</td>
        <td>${item.quantity}</td>
        <td>₹${total.toLocaleString()}</td>
      </tr>
      `;
    }).join('');

    // Create the HTML content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceData.invoiceNo}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            color: black !important;
            background-color: white;
            font-size: 12pt;
          }
          h1, h2, h3, p, td, th { color: black !important; }
          h1 { text-align: center; font-size: 24pt; margin: 0; }
          h3 { text-align: center; font-size: 10pt; margin: 5px 0; }
          .invoice-title { font-size: 14pt; font-weight: bold; text-align: center; margin: 15px 0; }
          .flex { display: flex; justify-content: space-between; margin: 20px 0; }
          .dotted-line { border-top: 1px dotted #000; margin: 10px 0; height: 1px; }
          .solid-line { border-top: 1px solid #000; margin: 10px 0; height: 1px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>everCleatr</h1>
        <h3>with added minerals</h3>
        <div class="invoice-title">${invoiceData.isPaid ? 'CASH' : 'CREDIT'} INVOICE</div>
        
        <div class="dotted-line"></div>
        
        <div class="flex">
          <div>
            <p><strong>To:</strong><br>
            ${invoiceData.customerName}<br>
            ${invoiceData.customerPhone}<br>
            ${invoiceData.customerAddress}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Invoice No:</strong> ${invoiceData.invoiceNo}<br>
            <strong>Date:</strong> ${invoiceData.invoiceDate}</p>
          </div>
        </div>
        
        <table>
          <tr>
            <th>SL</th>
            <th>Description</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
          <tr><td colspan="5"><div class="dotted-line"></div></td></tr>
          ${itemRows}
          <tr><td colspan="5"><div class="dotted-line"></div></td></tr>
          <tr class="total">
            <td colspan="4" style="text-align: left;">TOTAL:</td>
            <td>₹${invoiceData.total.toLocaleString()}</td>
          </tr>
        </table>
        
        <div class="solid-line"></div>
      </body>
      </html>
    `;
    
    // Generate a unique filename with timestamp
    const timestamp = new Date().getTime();
    const fileName = `simple-invoice-${invoiceData.invoiceNo}-${timestamp}.pdf`;
    
    // Generate the PDF using expo-print
    const { uri } = await Print.printToFileAsync({ html });
    console.log(`Temporary PDF generated at: ${uri}`);
    
    // Move the file to a more permanent location
    const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.moveAsync({
      from: uri,
      to: destinationUri
    });
    
    console.log(`Simple invoice PDF moved to: ${destinationUri}`);
    return destinationUri;
    
  } catch (error) {
    console.error('Error generating simple invoice PDF:', error);
    throw new Error('Failed to generate simple invoice PDF');
  }
};

/**
 * Share the generated PDF file
 */
export const shareInvoice = async (filePath: string): Promise<void> => {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Share Invoice'
      });
    } else {
      console.error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error sharing invoice:', error);
  }
}; 