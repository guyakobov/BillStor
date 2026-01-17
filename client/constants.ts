import { Category } from './types';
import { ShoppingBag, Utensils, Car, Home, HeartPulse, FileText, Folder } from 'lucide-react';

export const KEYWORDS = ["קבלה", "חשבונית", "invoice", "receipt", "זיכוי"];

export const DEFAULT_CATEGORIES = Object.values(Category);

export const CATEGORY_COLORS: Record<string, string> = {
  [Category.Shopping]: 'bg-blue-100 text-blue-600',
  [Category.Food]: 'bg-orange-100 text-orange-600',
  [Category.Transportation]: 'bg-green-100 text-green-600',
  [Category.Utilities]: 'bg-purple-100 text-purple-600',
  [Category.Health]: 'bg-red-100 text-red-600',
  [Category.Other]: 'bg-gray-100 text-gray-600',
};

export const CATEGORY_ICONS: Record<string, any> = {
  [Category.Shopping]: ShoppingBag,
  [Category.Food]: Utensils,
  [Category.Transportation]: Car,
  [Category.Utilities]: Home,
  [Category.Health]: HeartPulse,
  [Category.Other]: FileText,
};

export const getCategoryStyles = (category: string) => {
  return {
    icon: CATEGORY_ICONS[category] || Folder,
    colorClass: CATEGORY_COLORS[category] || 'bg-slate-100 text-slate-600',
  };
};

// Mock SMS messages for the simulator
export const MOCK_SMS_MESSAGES = [
  {
    id: 'sms-1',
    sender: 'SuperPharm',
    body: 'תודה שקנית סופר-פארם! הקבלה שלך ע"ס 142.50 ש"ח זמינה בקישור: https://receipts.com/sp/12345',
    timestamp: Date.now() - 100000,
  },
  {
    id: 'sms-2',
    sender: 'Wolt',
    body: 'ההזמנה בדרך! חשבונית מס קבלה עבור ההזמנה מ"בורגר סלון" בסך 88.00 ש"ח. לצפייה: https://wolt.com/r/xyz',
    timestamp: Date.now() - 500000,
  },
  {
    id: 'sms-3',
    sender: 'Gett',
    body: 'תודה שנסעת עם Gett. מצורפת חשבונית נסיעה ע"ס 45.00 ש"ח. לינק: https://gett.com/r/999',
    timestamp: Date.now() - 86400000,
  },
  {
    id: 'sms-4',
    sender: 'ElectricCo',
    body: 'חשבון חשמל לחודש ינואר בסך 420.90 ש"ח שולם בהצלחה. לצפייה בחשבונית: https://iec.co.il/doc/111',
    timestamp: Date.now() - 120000000,
  },
  {
    id: 'sms-5',
    sender: 'Fox Home',
    body: 'לקוח יקר, לרשותך שובר זיכוי ע"ס 250.00 ש"ח בתוקף עד 31/12/2025. מספר שובר: 888777. לפרטים נוספים: https://fox.co.il/credit/888',
    timestamp: Date.now() - 200000,
  }
];
