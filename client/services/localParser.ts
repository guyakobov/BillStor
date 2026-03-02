import { Receipt, Category } from '../types';

export const analyzeReceiptFromText = async (smsBody: string): Promise<Partial<Receipt>> => {
    const strategies = [
        { regex: /קבלה מ- (.+?) לצפייה/, field: 'merchant' },
        { regex: /חשבונית מ- (.+?) לצפייה/, field: 'merchant' },
        { regex: /עסקה ב- (.+?) על סך/, field: 'merchant' },
        { regex: /רכישה ב- (.+?) על סך/, field: 'merchant' },
        { regex: /תשלום ל- (.+?) על סך/, field: 'merchant' },
    ];

    for (const strategy of strategies) {
        const match = smsBody.match(strategy.regex);
        if (match && match[1]) {
            let merchant = match[1].trim();
            merchant = merchant.replace(/ על סך.*$/, '').replace(/ לצפייה.*$/, '').trim();

            let amount = 0;
            const amountMatch = smsBody.match(/(\d+(\.\d+)?)(\s?)(ש"?ח|NIS)/);
            if (amountMatch) {
                amount = parseFloat(amountMatch[1]);
            }

            const isCredit = smsBody.includes('זיכוי') || smsBody.includes('שובר');

            return {
                merchant,
                amount,
                date: new Date().toISOString(),
                currency: '₪',
                category: Category.Other,
                type: isCredit ? 'credit' : 'receipt'
            };
        }
    }

    // Fallback if no regex matches
    return {
        merchant: undefined, // Let caller handle original sender name
        date: new Date().toISOString(),
        amount: 0,
        currency: "₪",
        category: Category.Other,
        type: smsBody.includes('זיכוי') || smsBody.includes('שובר') ? 'credit' : 'receipt'
    };
};

export const analyzeReceiptFromImage = async (base64Image: string): Promise<Partial<Receipt>> => {
    // Without AI, we can't extract info from image locally easily in the browser
    // Just return a generic receipt entry so the user can edit it manually later
    return {
        merchant: "קבלה מסריקה",
        date: new Date().toISOString(),
        amount: 0,
        currency: "₪",
        category: Category.Other,
        type: 'receipt'
    };
};
