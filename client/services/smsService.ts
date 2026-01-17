import { MessageReader } from '@solimanware/capacitor-sms-reader';
import { KEYWORDS } from '../constants';
import { SMSMessage } from '../types';

export interface SmsPermissionResult {
    granted: boolean;
    error?: string;
}

export interface SmsReadResult {
    messages: SMSMessage[];
    error?: string;
}

/**
 * Check if SMS permissions are granted
 */
export const checkSmsPermissions = async (): Promise<SmsPermissionResult> => {
    try {
        const result = await MessageReader.checkPermissions();
        return {
            granted: result.granted === true
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
        const result = await MessageReader.requestPermissions();
        return {
            granted: result.granted === true
        };
    } catch (error) {
        console.error('Error requesting SMS permissions:', error);
        return {
            granted: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

/**
 * Read SMS messages from the device and filter for receipt-related messages
 */
export const readReceiptSms = async (): Promise<SmsReadResult> => {
    try {
        // First check if we have permissions
        const permissionCheck = await checkSmsPermissions();
        if (!permissionCheck.granted) {
            return {
                messages: [],
                error: 'SMS permissions not granted'
            };
        }

        // Get all SMS messages
        const result = await MessageReader.getMessages({});

        if (!result || !result.messages) {
            return {
                messages: [],
                error: 'No messages returned from SMS reader'
            };
        }

        // Filter messages that contain receipt keywords
        const receiptMessages: SMSMessage[] = result.messages
            .filter((msg: any) => {
                const body = msg.body || '';
                return KEYWORDS.some(keyword =>
                    body.toLowerCase().includes(keyword.toLowerCase())
                );
            })
            .map((msg: any) => ({
                id: msg._id || `sms-${Date.now()}-${Math.random()}`,
                sender: msg.address || 'Unknown',
                body: msg.body || '',
                timestamp: msg.date ? parseInt(msg.date) : Date.now()
            }));

        console.log(`Found ${receiptMessages.length} receipt messages out of ${result.messages.length} total`);

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
    try {
        const result = await MessageReader.getCount();
        return result?.count || 0;
    } catch (error) {
        console.error('Error getting SMS count:', error);
        return 0;
    }
};
