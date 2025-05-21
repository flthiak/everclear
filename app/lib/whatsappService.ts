// WhatsApp Business API implementation
console.log('LOADED WHATSAPP SERVICE - WILL MAKE ACTUAL API CALLS');

interface WhatsAppResult {
  success: boolean;
  message: string;
  messageId?: string;
  debugInfo?: any;
}

/**
 * Send WhatsApp message using WhatsApp Business API
 */
export const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<WhatsAppResult> => {
  const formattedNumber = phoneNumber.startsWith('+') 
    ? phoneNumber 
    : '+' + phoneNumber.replace(/[^0-9]/g, '');

  console.log(`WhatsApp Service: Sending message to ${formattedNumber}`);
  console.log(`Message content: ${message}`);

  try {
    // Get WhatsApp credentials from environment variables
    const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      throw new Error('WhatsApp credentials are missing in environment variables');
    }

    // Make the API request to WhatsApp Business API
    const response = await fetch(`https://graph.facebook.com/v17.0/${whatsappPhoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: { body: message }
      }),
    });

    // Parse the response
    const data = await response.json();
    
    // Check if the request was successful
    if (response.ok) {
      console.log('WhatsApp message sent successfully', data.messages?.[0]?.id);
      return {
        success: true,
        message: 'WhatsApp message sent successfully',
        messageId: data.messages?.[0]?.id
      };
    } else {
      console.error('WhatsApp API error:', data.error?.message);
      console.error('Full error response:', data);
      
      return {
        success: false,
        message: data.error?.message || 'Failed to send WhatsApp message',
        debugInfo: data
      };
    }
  } catch (error: any) {
    console.error('WhatsApp sending error:', error);
    return {
      success: false,
      message: error.message || 'Unknown error',
      debugInfo: error
    };
  }
}; 