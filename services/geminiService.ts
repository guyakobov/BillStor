import { GoogleGenAI, Type } from "@google/genai";
import { Receipt, Category } from "../types";

// Initialize Gemini lazily
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    // Vite will replace process.env.API_KEY during build
    const apiKey = process.env.API_KEY || "";
    aiInstance = new GoogleGenAI(apiKey);
  }
  return aiInstance;
};

export const analyzeReceiptFromText = async (smsBody: string): Promise<Partial<Receipt>> => {
  try {
    const ai = getAI();
    const model = 'gemini-1.5-flash-latest';

    // We define a schema to ensure structured JSON output
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        merchant: { type: Type.STRING, description: "The name of the business or sender" },
        date: { type: Type.STRING, description: "The date of the transaction in ISO YYYY-MM-DD format. If today, use current date." },
        amount: { type: Type.NUMBER, description: "The total amount paid or credited" },
        currency: { type: Type.STRING, description: "The currency symbol (₪, $, €)" },
        category: {
          type: Type.STRING,
          enum: Object.values(Category),
          description: "The category of the expense"
        },
        type: {
          type: Type.STRING,
          enum: ["receipt", "credit"],
          description: "The type of document. 'credit' if the text mentions 'זיכוי', 'refund', 'voucher' or 'credit note'. 'receipt' otherwise."
        },
        expirationDate: { type: Type.STRING, description: "If type is 'credit', extract the expiration date (valid until) in ISO format." }
      },
      required: ["merchant", "amount", "category", "type"],
    };

    const prompt = `
      You are an expert Israeli accountant assistant. 
      Analyze the following SMS message.
      It might be a receipt (חשבונית/קבלה) or a credit note (זיכוי/שובר החלפה).
      
      Extract:
      1. Merchant name
      2. Date (ISO)
      3. Amount
      4. Currency
      5. Category (${Object.values(Category).join(', ')})
      6. Type ('receipt' or 'credit'). If it contains words like 'זיכוי', classify as 'credit'.
      7. Expiration Date (ISO) - ONLY if it is a credit note and has a due date/validity date.

      SMS Content: "${smsBody}"
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        merchant: data.merchant,
        date: data.date || new Date().toISOString(),
        amount: data.amount,
        currency: data.currency || '₪',
        category: data.category as Category,
        type: data.type || 'receipt',
        expirationDate: data.expirationDate,
      };
    }

    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback for demo resilience
    return {
      merchant: "לא ידוע",
      date: new Date().toISOString(),
      amount: 0,
      currency: "₪",
      category: Category.Other,
      type: 'receipt'
    };
  }
};

export const analyzeReceiptFromImage = async (base64Image: string): Promise<Partial<Receipt>> => {
  try {
    const ai = getAI();
    const model = 'gemini-1.5-flash-latest';

    const prompt = `
      Analyze this image. It is either a Receipt or a Credit Note (Store Credit/Voucher).
      Extract:
      - merchant name
      - date (ISO format)
      - total amount
      - currency
      - category (${Object.values(Category).join(', ')})
      - type (return 'receipt' or 'credit')
      - expirationDate (if it is a credit note with validity, ISO format)

      Return JSON object.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        merchant: data.merchant || data.Merchant,
        date: data.date || data.Date || new Date().toISOString(),
        amount: data.amount || data.totalAmount || 0,
        currency: data.currency || '₪',
        category: (data.category as Category) || Category.Other,
        type: (data.type?.toLowerCase() === 'credit') ? 'credit' : 'receipt',
        expirationDate: data.expirationDate,
      };
    }

    throw new Error("Empty response from AI Image Analysis");

  } catch (error) {
    console.error("Gemini Image Error:", error);
    return {
      merchant: "סריקה נכשלה",
      date: new Date().toISOString(),
      amount: 0,
      currency: "₪",
      category: Category.Other,
      type: 'receipt'
    };
  }
};
