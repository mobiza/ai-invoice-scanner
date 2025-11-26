
export interface UploadedFile {
  id: string;
  file: File;
  previewUrl?: string;
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  result?: OCRResult;
  pageCount?: number; // Estimated
}

export interface OCRPageDimensions {
  dpi: number;
  height: number;
  width: number;
}

export interface OCRImageObject {
  id: string;
  top_left_x: number | null;
  top_left_y: number | null;
  bottom_right_x: number | null;
  bottom_right_y: number | null;
  image_base64: string | null;
  image_annotation?: string | null; 
}

export interface OCRPageObject {
  index: number;
  markdown: string;
  images: OCRImageObject[];
  dimensions: OCRPageDimensions | null;
}

export interface OCRUsageInfo {
  pages_processed: number;
  doc_size_bytes: number | null;
}

// Structured Receipt Data
export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  vatRate?: number; // KDV rate for this item (e.g. 1, 10, 20)
}

export interface TaxBreakdown {
  rate: number;
  amount: number; // KDV amount
  base: number;   // Matrah (Total - KDV)
}

export interface ReceiptData {
  merchantName: string;
  merchantAddress?: string;
  taxNumber?: string; // VN: Vergi No
  taxOffice?: string; // VD: Vergi Dairesi
  sicilNumber?: string; // SCL NO
  date: string;
  time?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  taxBreakdown?: TaxBreakdown[];
  total: number;
  totalInWords?: string; // Text representation: Yalnız Yüz Lira...
  currency: string;
  paymentMethod?: string;
  invoiceNumber?: string; // Fiş No
  zNumber?: string; // Z No
  ekuNumber?: string; // EKU No
  cashier?: string; // Kasiyer
}

export interface OCRResult {
  markdown: string; // Combined markdown of all pages
  json: {
    pages: OCRPageObject[];
    model: string;
    usage_info: OCRUsageInfo;
    document_annotation?: string | null;
    [key: string]: any; // Allow for other fields
  }; 
  images?: string[];
  receiptData?: ReceiptData | null; // The Gemini parsed data
  usage: {
    pages: number;
    cost: number;
  };
}

export type ApiMode = 'realtime' | 'batch';

export enum ModelType {
  OCR = 'mistral-ocr-latest',
  DOCUMENT_AI = 'document-ai' 
}

export interface PricingTier {
  name: string;
  pricePer1k: number;
  description: string;
}

export const PRICING = {
  OCR: { name: 'Standard OCR', pricePer1k: 1.0, description: 'Text & Layout Extraction' },
  ANNOTATION: { name: 'Annotated OCR', pricePer1k: 3.0, description: 'Structured Data Extraction' }
};

export type ViewMode = 'markdown' | 'rendered' | 'json' | 'images' | 'receipt';