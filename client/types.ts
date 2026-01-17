export enum Category {
  Shopping = 'קניות',
  Food = 'מזון ומסעדות',
  Transportation = 'תחבורה',
  Utilities = 'חשבונות ובית',
  Health = 'בריאות',
  Other = 'אחר'
}

export type ReceiptType = 'receipt' | 'credit';

export interface Receipt {
  id: string;
  merchant: string;
  date: string; // ISO String
  amount: number;
  currency: string;
  category: string; // Changed from Category enum to string to support custom folders
  originalSmsBody?: string;
  url?: string;
  imageUrl?: string;
  isProcessing: boolean;
  type: ReceiptType;
  expirationDate?: string; // Only for credits
}

export interface SMSMessage {
  id: string;
  sender: string;
  body: string;
  timestamp: number;
}
