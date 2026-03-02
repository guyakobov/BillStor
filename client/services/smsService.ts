import { registerPlugin } from '@capacitor/core';
import { KEYWORDS } from '../constants';
import { SMSMessage } from '../types';

export interface SmsPlugin {
    readSMS(): Promise<{ messages: any[] }>;
    checkPermissions(): Promise<{ sms: string }>;
    requestPermissions(): Promise<{ sms: string }>;
}

export const SmsPlugin = registerPlugin<SmsPlugin>('SmsPlugin');

export interface SmsPermissionResult {
    granted: boolean;
    error?: string;
}

export interface SmsReadResult {
    messages: SMSMessage[];
    error?: string;
}

/**
 * Helper to normalize permission status from various possible plugin response formats
 */
const isPermissionGranted = (result: any): boolean => {
    if (!result) return false;

    // Check all values in the result object for 'granted' or true
    const values = Object.values(result);
    if (values.some(v => v === 'granted' || v === true)) return true;

    // Check nested objects (some versions return nested states)
    for (const val of values) {
        if (typeof val === 'object' && val !== null) {
            if (Object.values(val).some(v => v === 'granted' || v === true)) return true;
        }
    }

    // OPTIMISTIC CHANGE FOR XIAOMI/Custom ROMs:
    // If we don't see an explicit 'granted', but also don't see 'denied' or 'never_ask_again',
    // we assume it might be allowed or worth trying.
    // Xiaomi often returns 'prompt' even when enabled in settings.
    const stringified = JSON.stringify(result).toLowerCase();
    if (stringified.includes('denied') || stringified.includes('never_ask_again')) {
        return false;
    }

    return true; // Assume allowed/prompt means "try reading"
};

/**
 * Check if SMS permissions are granted
 */
export const checkSmsPermissions = async (): Promise<SmsPermissionResult> => {
    try {
        const result = await SmsPlugin.checkPermissions();
        console.log('Permission check result:', JSON.stringify(result));
        return {
            granted: result.sms === 'granted'
        };
    } catch (error) {
        console.error('Error checking SMS permissions:', error);
        return {
            granted: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

/**
 * Request SMS permissions from the user
 */
export const requestSmsPermissions = async (): Promise<SmsPermissionResult> => {
    try {
        console.log('Attempting to request SMS permissions...');
        const result = await SmsPlugin.requestPermissions();
        console.log('Raw Result from requestPermissions:', JSON.stringify(result));

        return { granted: result.sms === 'granted' };
    } catch (error) {
        console.error('Error in requestSmsPermissions:', error);
        return {
            granted: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

/**
 * Helper to check if a message is a receipt based on keywords
 */
const isReceiptMessage = (body: string): boolean => {
    if (!body) return false;
    const lowerBody = body.toLowerCase();

    // Multiple keywords to check
    const keywords = [
        'קבלה',      // Receipt
        'חשבונית',   // Invoice  
        'עסקה',      // Transaction
        'תשלום',     // Payment
        'רכישה',     // Purchase
        'אישור',     // Confirmation
        'receipt',
        'invoice',
        'transaction',
        'purchase'
    ];

    // Check if ANY keyword exists
    return keywords.some(keyword =>
        lowerBody.includes(keyword.toLowerCase())
    );
}

/**
 * Read SMS messages from the device and filter for receipt-related messages
 */
export const readReceiptSms = async (): Promise<SmsReadResult> => {
    try {
        console.log('📱 Starting SMS read using custom SmsPlugin...');
        const result = await SmsPlugin.readSMS();

        const allMessages = result.messages || [];
        console.log(`📊 Total messages found on device: ${allMessages.length}`);

        if (allMessages.length > 0) {
            // Log first 3 messages for debugging
            allMessages.slice(0, 3).forEach((msg, idx) => {
                console.log(`Debug Msg ${idx}:`, {
                    from: msg.address,
                    body: (msg.body || '').substring(0, 50) + '...',
                    date: msg.date
                });
            });
        }

        // Filter for receipts
        const foundMessages = allMessages.filter((msg: any) => isReceiptMessage(msg.body));
        console.log(`Receipts found after filtering: ${foundMessages.length}`);

        if (foundMessages.length === 0 && allMessages.length > 0) {
            console.warn('⚠️ Found messages but none matched keywords. Check filtering logic.');
        }

        // Map to our internal format
        const receiptMessages: SMSMessage[] = foundMessages
            .map((msg: any) => ({
                id: msg.id || `sms-${Date.now()}-${Math.random()}`,
                sender: msg.address || 'Unknown',
                body: msg.body || '',
                timestamp: msg.date ? parseInt(msg.date) : Date.now()
            }));

        return {
            messages: receiptMessages
        };
    } catch (error) {
        console.error('Error reading SMS messages:', error);
        return {
            messages: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

/**
 * Get the count of SMS messages (useful for UI display)
 */
export const getSmsCount = async (): Promise<number> => {
    // Custom plugin doesn't have a count method yet, returning 0 or extending plugin later
    return 0;
};
