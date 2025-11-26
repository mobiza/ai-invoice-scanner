import React, { useState } from 'react';
import { processDocument } from './services/mistralService';
import { parseReceiptWithGemini } from './services/geminiService';
import FileUploader from './components/FileUploader';
import CostEstimator from './components/CostEstimator';
import OutputViewer from './components/OutputViewer';
import ReceiptViewer from './components/ReceiptViewer';
import { OCRResult, ApiMode } from './types';
import { Command, Cpu, Loader2, Zap, Layers, FileText, Receipt, Braces } from 'lucide-react';
import logoImg from './assets/logo.png';

const App: React.FC = () => {
    // inputSource can be a File object or a string URL
    const [inputSource, setInputSource] = useState<File | string | null>(null);

    // API Keys from Environment Variables
    const mistralApiKey = import.meta.env.VITE_MISTRAL_API_KEY;
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const [status, setStatus] = useState<'idle' | 'processing' | 'gemini_processing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<OCRResult | null>(null);
    const [estimatedPages, setEstimatedPages] = useState(1);
    const [apiMode, setApiMode] = useState<ApiMode>('batch'); // Default to Batch
    const [pageRange, setPageRange] = useState('');

    // Metrics for Cost Analysis
    const [inputCharCount, setInputCharCount] = useState(0);
    const [outputCharCount, setOutputCharCount] = useState(0);

    // UI Tabs for output
    const [activeTab, setActiveTab] = useState<'visual' | 'invoice_json' | 'raw'>('visual');

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleProcess = async () => {
        if (!inputSource) return;

        if (!mistralApiKey || !geminiApiKey) {
            setStatus('error');
            setStatusMessage('API Anahtarları .env dosyasında bulunamadı!');
            return;
        }

        setStatus('processing');
        setResult(null);
        setInputCharCount(0);
        setOutputCharCount(0);
        setActiveTab('visual'); // Default to visual view

        // Auto-close mobile menu on process start
        setIsMobileMenuOpen(false);

        try {
            // Step 1: Mistral OCR
            const ocrData = await processDocument(inputSource, mistralApiKey, apiMode, pageRange, (msg) => setStatusMessage(msg));

            // Calculate Input Size for Gemini (Raw Markdown)
            const rawMarkdownLength = ocrData.markdown ? ocrData.markdown.length : 0;
            setInputCharCount(rawMarkdownLength);

            // Step 2: Gemini Parsing
            setStatus('gemini_processing');
            setStatusMessage('Fiş Verisi Ayrıştırılıyor (Gemini / Auto-Detect)...');

            const receiptData = await parseReceiptWithGemini(ocrData.markdown, geminiApiKey);

            // Calculate Output Size for Gemini (JSON Result)
            const jsonLength = receiptData ? JSON.stringify(receiptData).length : 0;
            setOutputCharCount(jsonLength);

            // Combine results
            const finalResult: OCRResult = {
                ...ocrData,
                receiptData: receiptData
            };

            setResult(finalResult);
            setStatus('success');
            setActiveTab('visual');

            if (ocrData.usage.pages) {
                setEstimatedPages(ocrData.usage.pages);
            }
        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setStatusMessage(error.message || 'İşlem sırasında bir hata oluştu');
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[#f5f5f5] text-mistral-black selection:bg-mistral-black selection:text-white font-sans overflow-hidden">

            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 flex-shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                        >
                            <Layers size={24} />
                        </button>

                        <div className="h-8 sm:h-12 flex items-center">
                            <img src={logoImg} alt="Logo" className="h-full w-auto object-contain" />
                        </div>
                        <div className="h-6 sm:h-8 w-px bg-gray-300 mx-1 sm:mx-2"></div>
                        <div className="flex flex-col leading-none">
                            <span className="text-lg sm:text-xl tracking-tight font-sans text-gray-900 font-normal truncate max-w-[150px] sm:max-w-none">AI Invoice Scanner</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden h-full relative">

                {/* Mobile Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Left Panel: Controls (Sidebar / Drawer) */}
                <div className={`
            fixed inset-y-0 left-0 z-40 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
            lg:relative lg:inset-auto lg:w-auto lg:shadow-none lg:transform-none lg:col-span-4 lg:flex lg:flex-col lg:h-full lg:bg-transparent
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
                    {/* Mobile Header in Drawer */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 lg:hidden">
                        <span className="font-bold text-gray-900">Ayarlar & Yükleme</span>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500">
                            <Zap size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 lg:p-0 lg:pr-2 lg:pb-2 scrollbar-thin space-y-6 h-full">

                        {/* Upload Section */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 font-sans">
                                    <FileText size={12} /> Belge Yükle
                                </label>
                            </div>
                            <FileUploader
                                onInputSelect={(source) => { setInputSource(source); setStatus('idle'); setStatusMessage(''); }}
                                selectedInput={inputSource}
                                onClear={() => { setInputSource(null); setResult(null); setStatus('idle'); }}
                            />
                        </section>

                        {/* Options */}
                        <section className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 font-sans">
                                <Cpu size={12} /> İşlem Ayarları
                            </label>

                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                                {/* API Mode Toggle */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-700">İşlem Modu</span>
                                    <div className="flex bg-gray-100 p-1 rounded-md">
                                        <button
                                            onClick={() => setApiMode('batch')}
                                            className={`px-3 py-1 text-[10px] font-medium rounded-sm transition-all ${apiMode === 'batch' ? 'bg-white shadow-sm text-mistral-black' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Batch (Hızlı)
                                        </button>
                                        <button
                                            onClick={() => setApiMode('realtime')} // Changed from 'sync' to 'realtime' to match existing code
                                            className={`px-3 py-1 text-[10px] font-medium rounded-sm transition-all ${apiMode === 'realtime' ? 'bg-white shadow-sm text-mistral-black' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Normal (Anlık)
                                        </button>
                                    </div>
                                </div>

                                {/* Page Range */}
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-xs font-medium text-gray-700">Sayfa Aralığı</span>
                                        <span className="text-[10px] text-gray-400">(Opsiyonel)</span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Örn: 1, 3-5 (Tümü için boş bırakın)"
                                        value={pageRange}
                                        onChange={(e) => setPageRange(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 p-2 rounded text-xs focus:outline-none focus:border-mistral-black transition-colors font-sans"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Cost Estimator */}
                        <CostEstimator
                            pageCount={estimatedPages}
                            isAnnotated={true} // Kept existing prop
                            apiMode={apiMode}
                            status={status} // Kept existing prop
                            inputCharCount={inputCharCount}
                            outputCharCount={outputCharCount}
                        />

                        {/* Process Button */}
                        <button
                            onClick={handleProcess}
                            disabled={!inputSource || status === 'processing' || status === 'gemini_processing'}
                            className={`
                        w-full py-3 px-4 rounded-lg font-medium text-sm transition-all transform active:scale-[0.98] shadow-md flex items-center justify-center gap-2 font-sans
                        ${!inputSource
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : status === 'processing' || status === 'gemini_processing'
                                        ? 'bg-mistral-black/80 text-white cursor-wait'
                                        : 'bg-mistral-black text-white hover:bg-gray-800 hover:shadow-lg'
                                }
                    `}
                        >
                            {status === 'processing' ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    OCR İşleniyor...
                                </>
                            ) : status === 'gemini_processing' ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Gemini Analiz Ediyor...
                                </>
                            ) : (
                                <>
                                    <Zap size={16} className={inputSource ? "fill-current" : ""} />
                                    Analizi Başlat
                                </>
                            )}
                        </button>

                        {/* Status Message */}
                        {statusMessage && (
                            <div className={`text-xs text-center p-2 rounded font-medium animate-in fade-in slide-in-from-top-1 ${status === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'text-gray-500'
                                }`}>
                                {statusMessage}
                            </div>
                        )}

                        {/* Footer Copyright */}
                        <div className="mt-auto pt-4 text-[10px] text-gray-400 text-center font-sans border-t border-gray-100">
                            Copyright © Mobiza Teknoloji 2025
                        </div>
                    </div>
                </div>

                {/* Right Panel: Output */}
                <div className="lg:col-span-8 h-full overflow-hidden flex flex-col bg-white border border-gray-200 shadow-sm relative">
                    {result ? (
                        <>
                            <div className="flex border-b border-gray-200 bg-gray-50">
                                <button
                                    onClick={() => setActiveTab('visual')}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors ${activeTab === 'visual' ? 'bg-white border-b-2 border-mistral-black text-mistral-black' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Receipt size={14} /> Önizleme
                                </button>
                                <button
                                    onClick={() => setActiveTab('invoice_json')}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors ${activeTab === 'invoice_json' ? 'bg-white border-b-2 border-mistral-black text-mistral-black' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Braces size={14} /> Fatura JSON
                                </button>
                                <button
                                    onClick={() => setActiveTab('raw')}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors ${activeTab === 'raw' ? 'bg-white border-b-2 border-mistral-black text-mistral-black' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <FileText size={14} /> Ham Veri (OCR)
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                {activeTab === 'visual' && result.receiptData && (
                                    <ReceiptViewer data={result.receiptData} />
                                )}

                                {activeTab === 'invoice_json' && result.receiptData && (
                                    <div className="h-full overflow-y-auto p-4 bg-gray-50">
                                        <pre className="text-xs font-mono text-blue-700 whitespace-pre-wrap break-all">
                                            {JSON.stringify(result.receiptData, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {activeTab === 'raw' && (
                                    <OutputViewer result={result} />
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                            <Receipt size={64} strokeWidth={1} />
                            <p className="mt-4 text-sm font-medium text-gray-400">Sonuçlar burada görüntülenecek</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;