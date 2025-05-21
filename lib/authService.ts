import { supabase } from './supabase';

interface VerificationResult {
  success: boolean;
  error?: string;
  userData?: {
    id: string;
    user_phone: string;
    roleId: string;
    name?: string;
    pin?: string;
  };
}

interface UserData {
  id: string;
  phone_number: string;
  role_id: string;
  name?: string;
  pin?: string;
}

/**
 * Requests a verification code to be sent to the user's phone number
 * @param name User's name
 * @param phoneNumber User's phone number
 * @returns Result of the verification code request
 */
export const requestVerificationCode = async (
  name: string,
  phoneNumber: string
): Promise<VerificationResult> => {
  try {
    console.log(`[authService] Requesting verification code for ${name} at ${phoneNumber}`);
    
    // Call the Supabase RPC to request a verification code
    const { data, error } = await supabase.rpc('request_verification_code', {
      p_name: name,
      p_phone_number: phoneNumber
    });
    
    if (error) {
      console.error('[authService] Error requesting verification code:', error);
      return {
        success: false,
        error: error.message || 'Failed to request verification code'
      };
    }
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('[authService] Unexpected error requesting verification code:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

/**
 * Verifies the setup PIN and creates a new user
 * @param phoneNumber User's phone number
 * @param verificationPin Verification PIN
 * @param name User's name
 * @returns Result of the verification and user creation
 */
export const verifySetupPinAndCreateUser = async (
  phoneNumber: string,
  verificationPin: string,
  name: string
): Promise<VerificationResult> => {
  try {
    console.log(`[authService] Verifying setup PIN for ${phoneNumber}`);
    
    // Call the Supabase RPC to verify the PIN and create the user
    const { data, error } = await supabase.rpc('verify_setup_pin_and_create_user', {
      p_phone_number: phoneNumber,
      p_verification_pin: verificationPin,
      p_name: name
    });
    
    if (error) {
      console.error('[authService] Error verifying setup PIN:', error);
      return {
        success: false,
        error: error.message || 'Verification failed'
      };
    }
    
    if (!data) {
      return {
        success: false,
        error: 'No user data returned after verification'
      };
    }
    
    // Cast the data to UserData type
    const userData = data as unknown as UserData;
    
    if (!userData.id) {
      return {
        success: false,
        error: 'Invalid user data returned'
      };
    }
    
    return {
      success: true,
      userData: {
        id: userData.id,
        user_phone: userData.phone_number,
        roleId: userData.role_id,
        name: userData.name,
        pin: userData.pin
      }
    };
  } catch (error: any) {
    console.error('[authService] Unexpected error verifying setup PIN:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

/**
 * Resets the user's password
 * @param phoneNumber User's phone number
 * @returns Result of the password reset request
 */
export const resetPassword = async (
  phoneNumber: string
): Promise<VerificationResult> => {
  try {
    console.log(`[authService] Requesting password reset for ${phoneNumber}`);
    
    // Call the Supabase RPC to reset the password
    const { data, error } = await supabase.rpc('reset_user_password', {
      p_phone_number: phoneNumber
    });
    
    if (error) {
      console.error('[authService] Error resetting password:', error);
      // For security reasons, always return success=true
      return {
        success: true
      };
    }
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('[authService] Unexpected error resetting password:', error);
    // For security reasons, always return success=true
    return {
      success: true
    };
  }
}; 