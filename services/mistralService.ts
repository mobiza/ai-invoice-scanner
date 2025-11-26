
import { OCRResult, ApiMode } from '../types';

const API_ENDPOINT = 'https://api.mistral.ai/v1/ocr';

/**
 * Simulates a delay for the mock service
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Converts a file to Base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove data URL prefix
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Checks if a string is a URL
 */
const isUrl = (str: string) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

export const processDocument = async (
  inputSource: File | string,
  apiKey: string,
  apiMode: ApiMode,
  pages: string, // e.g. "1-5" or empty for all
  onProgress: (status: string) => void
): Promise<OCRResult> => {

  // -- MOCK MODE (Only if no API key is provided) --
  if (!apiKey || apiKey.trim() === '') {
    await delay(800);
    onProgress('Uploading document (Mock)...');

    if (apiMode === 'batch') {
      await delay(1000);
      onProgress('Batch Job Queued (ID: batch_mock_001)...');
      await delay(800);
      onProgress('Processing in Batch Queue...');
    }

    await delay(800);
    onProgress('Mistral OCR: Detecting text lines...');
    await delay(600);
    onProgress('Mistral OCR: Generating markdown...');
    await delay(600);

    // Simulate a Receipt Markdown
    const mockReceiptMarkdown = `
# MIGROS TICARET A.S.
Atatürk Mah. İstiklal Cad. No:12
Istanbul / TR
Tel: 0212 555 10 20

**TARIH**: 22.05.2024  **SAAT**: 14:30
**FİS NO**: 0045      **EKU NO**: 0001

| URUN ADI | MIKTAR | FIYAT | TUTAR |
| :--- | :--- | :--- | :--- |
| SÜTAŞ TAM YAĞLI SÜT 1L | 2 Adet | *35,50 | 71,00 |
| BARILLA SPAGETTI 500G | 1 Adet | *28,90 | 28,90 |
| DOMATES (KG) | 1,500 Kg | *40,00 | 60,00 |
| POŞET | 1 Adet | *0,25 | 0,25 |

---
**ARA TOPLAM**: 140,00 ₺
**KDV (%18)**: 20,15 ₺
**GENEL TOPLAM**: 160,15 ₺
---

**ODEME**: KREDI KARTI (**** 1234)
**KASİYER**: Ahmet Y.

Mali Değeri Yoktur.
Tesekkürler, yine bekleriz.
`;

    return {
      markdown: mockReceiptMarkdown,
      json: {
        model: "mistral-ocr-mock",
        pages: [
          { index: 0, markdown: mockReceiptMarkdown, images: [], dimensions: { dpi: 72, width: 600, height: 1000 } }
        ],
        usage_info: {
          pages_processed: 1,
          doc_size_bytes: 1024
        }
      },
      images: [],
      usage: {
        pages: 1,
        cost: 0
      }
    };
  }

  // -- REAL API IMPLEMENTATION --
  try {
    let payload: any = {
      model: import.meta.env.VITE_MISTRAL_MODEL || "mistral-ocr-latest",
      include_image_base64: true
    };

    onProgress('Preparing document...');

    // Handle Input Type (File or URL)
    if (typeof inputSource === 'string' && isUrl(inputSource)) {
      // It is a URL
      const isImage = /\.(jpeg|jpg|png|webp)$/i.test(inputSource);
      payload.document = {
        type: isImage ? 'image_url' : 'document_url',
        [isImage ? 'image_url' : 'document_url']: inputSource
      };
      onProgress('Sending URL to Mistral...');

    } else if (inputSource instanceof File) {
      // It is a File
      onProgress('Encoding file...');
      const base64Image = await fileToBase64(inputSource);
      const isImage = inputSource.type.startsWith('image/');
      const docType = isImage ? 'image_url' : 'document_url';
      const dataUri = `data:${inputSource.type};base64,${base64Image}`;

      payload.document = {
        type: docType,
        [docType === 'image_url' ? 'image_url' : 'document_url']: dataUri
      };
      onProgress('Uploading to Mistral Cloud...');
    } else {
      throw new Error("Invalid input source");
    }

    if (apiMode === 'batch') {
      onProgress('Sending to Batch Queue...');
      // Note: Real batch implementation usually requires a different endpoint or async id handling
      // For now, we hit the standard endpoint but flag it
    }

    if (pages && pages.trim() !== '') {
      const pageList = pages.split(',').map(p => parseInt(p.trim())).filter(n => !isNaN(n));
      if (pageList.length > 0) {
        payload.pages = pageList;
      }
    }

    const endpoint = API_ENDPOINT;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        // failed to parse error json
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Fix: Join ALL pages, not just the first one.
    const fullMarkdown = data.pages
      ? data.pages.map((p: any) => p.markdown).join('\n\n---\n\n')
      : (data.markdown || '');

    // Extract all images from all pages
    const allImages = data.pages?.flatMap((p: any) => p.images?.map((img: any) => img.image_base64 || img) || []) || [];

    return {
      markdown: fullMarkdown,
      json: data, // Return the FULL API response object
      images: allImages,
      usage: {
        pages: data.usage_info?.pages_processed || data.pages?.length || 1,
        cost: 0
      }
    };

  } catch (error: any) {
    console.error("OCR Error:", error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("Network Error: Possible CORS issue. Mistral API may not allow direct browser access. Please use a proxy or check your internet connection.");
    }
    throw error;
  }
};
