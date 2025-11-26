
import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData, ReceiptItem, TaxBreakdown } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert Turkish Fiscal Receipt (Mali Fiş) Parser AI.
Your task is to take OCR Markdown text and extract structured data compliant with Turkish Receipt standards (VUK 507).

Key Extraction Rules:
1. **Merchant Details**: Look for company titles (A.Ş., Ltd. Şti.), addresses, "VN" (Vergi No), "VD" (Vergi Dairesi), "Mersis No".
2. **Fiscal IDs**: Extract "Fiş No" (Receipt No), "Z No", "EKU No" (Mali Hafıza No), "Kasiyer" (Cashier).
3. **VAT (KDV) Handling**: 
   - Identify the VAT rate (%1, %8, %10, %20) for EACH item.
   - Extract the VAT Breakdown table usually found at the bottom (KDV, Matrah, Tutar).
4. **Items**: 
   - Extract Description, Quantity, Unit Price, and Total Price. 
   - Clean up artifacts like "*" or "e" next to prices.
   - **CALCULATION RULE**: If Unit Price is missing but Total Price exists, calculate it: Unit Price = Total Price / Quantity.
   - **CALCULATION RULE**: If Quantity is missing, assume 1.
5. **Totals & Math**:
   - **IMPORTANT**: If "ARA TOPLAM" (Subtotal), "TOPLAM KDV" (Tax), or "GENEL TOPLAM" (Total) are missing or illegible, YOU MUST CALCULATE THEM based on the extracted items.
   - Subtotal = Sum of all item prices before tax.
   - Total = Subtotal + Tax.
6. **Formatting**:
   - Dates should be YYYY-MM-DD.
   - Currency should be '₺'.
   - Missing fields should be empty string or null. Do NOT invent data like Merchant Name or Address if completely absent.

7. **Corrections & Enhancements**:
   - **Spell Check**: Correct obvious OCR typos in item descriptions or merchant names.
     - "BUYOK MUKELLEFLER" -> "BÜYÜK MÜKELLEFLER"
     - "VDB" -> "V.D."
     - "BIM BIRLESIK" -> "BİM BİRLEŞİK"
     - "MAGAZALAR" -> "MAĞAZALAR"
     - "DOM4TES" -> "DOMATES"
     - "MIGR0S" -> "MIGROS"
   - **Total In Words**: Convert the final 'total' amount into a formal Turkish written string.
     - Format: "Yalnız [LiraAmount] Türk Lirası [KurusAmount] Kuruş"
     - Example: 150.25 -> "Yalnız Yüz Elli Türk Lirası Yirmi Beş Kuruş"
     - If Kuruş is 0, omit it (e.g. "Yalnız On Türk Lirası").

Input text is raw OCR output, so it may have noise. Use context to correct obvious OCR errors.
`;

/**
 * Recalculates Subtotal, Tax, and Total based on line items to ensure mathematical consistency.
 * This fixes issues where the OCR/AI returns 0 for totals but has valid items.
 */
const recalculateFinancials = (data: ReceiptData): ReceiptData => {
  if (!data.items || data.items.length === 0) return data;

  let calculatedTotal = 0;
  let calculatedTax = 0;
  let calculatedSubtotal = 0;

  // Track breakdown by rate
  const breakdownMap: Record<number, { base: number, amount: number }> = {};

  data.items.forEach(item => {
    // Ensure numbers
    const price = Number(item.totalPrice) || 0;
    const rate = Number(item.vatRate) || 0; // Default to 0 if missing, usually 1, 10, 20

    calculatedTotal += price;

    // Back-calculate Tax from Gross Price
    // Formula: Tax = Price * (Rate / (100 + Rate))
    const taxAmount = price * (rate / (100 + rate));
    const baseAmount = price - taxAmount;

    calculatedTax += taxAmount;
    calculatedSubtotal += baseAmount;

    // Update Breakdown
    if (!breakdownMap[rate]) {
      breakdownMap[rate] = { base: 0, amount: 0 };
    }
    breakdownMap[rate].base += baseAmount;
    breakdownMap[rate].amount += taxAmount;
  });

  // Reconstruct breakdown array
  const newBreakdown: TaxBreakdown[] = Object.keys(breakdownMap).map(r => {
    const rate = Number(r);
    return {
      rate,
      base: Number(breakdownMap[rate].base.toFixed(2)),
      amount: Number(breakdownMap[rate].amount.toFixed(2))
    };
  });

  // Override if original values are missing or zero (or just force consistency)
  const finalTotal = data.total > 0 ? data.total : calculatedTotal;

  // If the AI didn't provide tax/subtotal, use ours. 
  // If it did, check if they match rough logic. If 0, use ours.
  const finalTax = (data.tax && data.tax > 0) ? data.tax : calculatedTax;
  const finalSubtotal = (data.subtotal && data.subtotal > 0) ? data.subtotal : calculatedSubtotal;

  return {
    ...data,
    total: Number(finalTotal.toFixed(2)),
    tax: Number(finalTax.toFixed(2)),
    subtotal: Number(finalSubtotal.toFixed(2)),
    taxBreakdown: data.taxBreakdown && data.taxBreakdown.length > 0 ? data.taxBreakdown : newBreakdown
  };
};

/**
 * Fallback parser for basic regex extraction
 */
const parseViaRegex = (text: string): ReceiptData => {
  const lines = text.split('\n').filter(line => line.trim() !== '');

  // Try to find merchant name (first non-empty line usually)
  let merchantName = lines[0]?.replace(/^[#*]+\s*/, '') || "";

  let total = 0;
  const totalRegex = /(?:TOPLAM|TOTAL|TUTAR|AMOUNT)[\s:*]*([\d,.]+)\s*([$€₺]?)/i;
  const totalMatch = text.match(totalRegex);
  if (totalMatch) {
    total = parseFloat(totalMatch[1].replace(',', '.'));
  }

  let date = "";
  const dateRegex = /(\d{2}[./-]\d{2}[./-]\d{2,4})|(\d{4}[./-]\d{2}[./-]\d{2})/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) date = dateMatch[0];

  const items: ReceiptItem[] = [];
  const priceLineRegex = /(.+?)\s+([\d,.]+)\s*([$€₺]?)$/;

  lines.slice(1, -3).forEach(line => {
    const cleanLine = line.replace(/^\|\s*/, '').replace(/\s*\|$/, '');
    const match = cleanLine.match(priceLineRegex);
    if (match) {
      const desc = match[1].trim();
      if (/toplam|kdv|subtotal|total|ara toplam/i.test(desc)) return;
      const price = parseFloat(match[2].replace(',', '.'));
      if (!isNaN(price) && price > 0) {
        items.push({ description: desc, quantity: 1, unitPrice: price, totalPrice: price, category: 'General', vatRate: 20 });
      }
    }
  });

  // Auto-calculate missing totals in fallback mode
  const calculatedSubtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
  const finalTotal = total > 0 ? total : calculatedSubtotal;
  const tax = finalTotal * 0.18; // approx assumption if missing
  const subtotal = finalTotal - tax;

  return {
    merchantName,
    merchantAddress: "",
    date,
    time: "",
    invoiceNumber: "",
    items: items.length > 0 ? items : [{ description: "Ürün Bulunamadı", quantity: 1, unitPrice: finalTotal, totalPrice: finalTotal, vatRate: 20 }],
    subtotal: subtotal,
    tax: tax,
    total: finalTotal,
    totalInWords: "", // Fallback cannot generate words easily
    currency: '₺',
    paymentMethod: "",
    zNumber: "",
    ekuNumber: "",
    taxNumber: ""
  };
};

export const parseReceiptWithGemini = async (
  markdownText: string,
  apiKey: string
): Promise<ReceiptData> => {

  if (!apiKey || apiKey.trim() === '') {
    return parseViaRegex(markdownText);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Detailed Schema for Turkish Receipts
  const schema = {
    type: Type.OBJECT,
    properties: {
      merchantName: { type: Type.STRING },
      merchantAddress: { type: Type.STRING },
      taxNumber: { type: Type.STRING, description: "Vergi No (VN) or TC Kimlik No" },
      taxOffice: { type: Type.STRING, description: "Vergi Dairesi (VD)" },
      sicilNumber: { type: Type.STRING, description: "Ticaret Sicil No" },
      date: { type: Type.STRING, description: "YYYY-MM-DD" },
      time: { type: Type.STRING, description: "HH:MM" },
      invoiceNumber: { type: Type.STRING, description: "Fiş No or Fatura No" },
      zNumber: { type: Type.STRING, description: "Z No" },
      ekuNumber: { type: Type.STRING, description: "EKU No / Mali Hafıza No" },
      cashier: { type: Type.STRING, description: "Kasiyer Name or ID" },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unitPrice: { type: Type.NUMBER },
            totalPrice: { type: Type.NUMBER },
            category: { type: Type.STRING },
            vatRate: { type: Type.NUMBER, description: "VAT/KDV percentage (e.g. 1, 10, 20)" }
          }
        }
      },
      taxBreakdown: {
        type: Type.ARRAY,
        description: "Summary table of VAT rates, base amounts, and tax amounts",
        items: {
          type: Type.OBJECT,
          properties: {
            rate: { type: Type.NUMBER },
            base: { type: Type.NUMBER, description: "Matrah (Amount excluding tax)" },
            amount: { type: Type.NUMBER, description: "Tax amount" }
          }
        }
      },
      subtotal: { type: Type.NUMBER },
      tax: { type: Type.NUMBER },
      total: { type: Type.NUMBER },
      totalInWords: { type: Type.STRING, description: "Total amount written in words e.g. Yalnız Yüz TL..." },
      currency: { type: Type.STRING },
      paymentMethod: { type: Type.STRING },
    },
    required: ["merchantName", "items", "total"]
  };

  try {
    const response = await ai.models.generateContent({
      model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-lite-preview-02-05',
      contents: `Extract detailed Turkish fiscal receipt data from this text:\n\n${markdownText}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from Gemini");

    const parsedData = JSON.parse(jsonText) as ReceiptData;

    // ENFORCE CALCULATION: Fix 0.00 issues by recalculating based on items
    return recalculateFinancials(parsedData);

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return parseViaRegex(markdownText);
  }
};
