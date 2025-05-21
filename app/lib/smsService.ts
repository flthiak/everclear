// Real SMS implementation using Twilio API
console.log('LOADED REAL SMS SERVICE - WILL MAKE ACTUAL API CALLS');

interface SMSResult {
  success: boolean;
  message: string;
  messageSid?: string;
  debugInfo?: any;
}

/**
 * Send direct SMS using Twilio Messages API
 */
export const sendDirectSMS = async (phoneNumber: string, message: string): Promise<SMSResult> => {
  const formattedNumber = phoneNumber.startsWith('+') 
    ? phoneNumber 
    : '+' + phoneNumber.replace(/[^0-9]/g, '');

  console.log(`SMS Service: Sending SMS to ${formattedNumber}`);
  console.log(`Message content: ${message}`);

  try {
    // Use environment variables instead of hardcoded credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID || "YOUR_ACCOUNT_SID";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "YOUR_AUTH_TOKEN";
    const fromPhone = process.env.TWILIO_PHONE_NUMBER || "+1XXXXXXXXXX";
    
    console.log('[REAL] Using Twilio credentials for API call:');
    console.log('Using account:', accountSid.substring(0, 6) + '...');
    console.log('Using phone:', fromPhone);
    
    // Log SMS attempt (for debugging)
    console.log(`Making Twilio API call to send SMS to: ${formattedNumber}`);
    
    // Base64 encode credentials for Authorization header
    const auth = btoa(`${accountSid}:${authToken}`);
    
    // Make the API request to Twilio Messages API
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedNumber,
        From: fromPhone,
        Body: message,
      }).toString(),
    });

    // Parse the response
    const data = await response.json();
    
    // Check if the request was successful
    if (response.ok) {
      console.log('SMS sent successfully', data.sid);
      return {
        success: true,
        message: 'SMS sent successfully',
        messageSid: data.sid
      };
    } else {
      console.error('Twilio API error:', data.message);
      console.error('Full error response:', data);
      
      return {
        success: false,
        message: data.message || 'Failed to send SMS',
        debugInfo: data
      };
    }
  } catch (error: any) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      message: error.message || 'Unknown error',
      debugInfo: error
    };
  }
}; 