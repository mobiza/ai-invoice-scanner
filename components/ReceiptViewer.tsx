import React, { useState, useRef } from 'react';
import { ReceiptData } from '../types';
import { Scroll, FileSpreadsheet, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import gibImg from '../assets/gib.png';

interface ReceiptViewerProps {
    data: ReceiptData;
}

const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ data }) => {
    const [viewMode, setViewMode] = useState<'receipt' | 'invoice'>('receipt');
    const contentRef = useRef<HTMLDivElement>(null);

    // --- STRICT FORMATTERS ---

    // Date: YYYY-MM-DD -> DD.MM.YYYY
    const fmtDate = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const [year, month, day] = dateStr.split('-');
            if (year && month && day) return `${day}.${month}.${year}`;
            return dateStr;
        } catch (e) {
            return dateStr;
        }
    };

    // Currency: Always 2 decimals (e.g. 100,00 or 12.345,50)
    const fmtCurrency = (num?: number) => {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num || 0);
    };

    // Quantity: Max 3 decimals, remove trailing zeros (e.g. 1.00 -> 1, 1.50 -> 1,5)
    const fmtQty = (num?: number) => {
        const val = num && num > 0 ? num : 1;
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }).format(val);
    };

    // VAT Rate: Max 2 decimals, remove trailing zeros (e.g. 20.00 -> 20, 18.5 -> 18,5)
    const fmtRate = (num?: number) => {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(num || 0);
    };

    const LOGO_URL = gibImg;

    const handlePrint = useReactToPrint({
        contentRef: contentRef,
        documentTitle: viewMode === 'invoice' ? `Fatura_${data.invoiceNumber || 'Taslak'}` : `Fis_${data.invoiceNumber || 'Taslak'}`,
    });

    return (
        <div className="printable-wrapper flex flex-col h-full bg-gray-100 font-sans relative">

            {/* View Toggle Header (Hidden in Print) */}
            <div className="flex justify-between items-center p-3 bg-white border-b border-gray-200 shadow-sm z-20 flex-shrink-0 no-print">
                <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                    <button
                        onClick={() => setViewMode('receipt')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'receipt' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Scroll size={14} /> Fiş Görünümü
                    </button>
                    <button
                        onClick={() => setViewMode('invoice')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'invoice' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <FileSpreadsheet size={14} /> Fatura Görünümü
                    </button>
                </div>

                <button
                    onClick={() => handlePrint()}
                    className="flex items-center gap-2 px-4 py-1.5 bg-mistral-black text-white rounded-md text-xs font-medium hover:bg-gray-800 transition-colors"
                >
                    <Download size={14} /> PDF / Yazdır
                </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 flex justify-center p-8 bg-gray-200/50">
                <div ref={contentRef} className="w-full flex justify-center">
                    <style>{`
                        @media print {
                            @page { 
                                size: ${viewMode === 'invoice' ? 'A4 portrait' : '80mm auto'}; 
                                margin: ${viewMode === 'invoice' ? '20mm' : '0'}; 
                            }
                            body { 
                                margin: 0; 
                                padding: 0; 
                                -webkit-print-color-adjust: exact; 
                                print-color-adjust: exact;
                                background-color: white;
                            }
                            /* Invoice Wrapper: Width only, margins handled by @page */
                            .invoice-print-wrapper {
                                width: 100%;
                                box-sizing: border-box;
                            }
                            /* Receipt Wrapper: Centers the receipt */
                            .receipt-print-wrapper {
                                width: 100%;
                                display: flex;
                                justify-content: center;
                                padding-top: 10mm;
                            }
                            /* Ensure content fits */
                            .printable-area {
                                box-shadow: none !important;
                                margin: 0 !important;
                            }
                            .printable-area.invoice {
                                width: 100% !important;
                                max-width: none !important;
                                border: 1px solid #eee !important;
                            }
                        }
                    `}</style>


                    {/* =======================
            RECEIPT VIEW (THERMAL)
           ======================= */}
                    {viewMode === 'receipt' && (
                        <div className="receipt-print-wrapper">
                            <div className="printable-area relative w-full max-w-[320px] bg-white shadow-xl text-[#1a1a1a] font-sans text-xs leading-snug animate-in fade-in zoom-in-95 duration-300 self-start print:shadow-none print:max-w-none print:w-[80mm] print:mx-auto print:absolute print:top-0 print:left-0">
                                {/* Content Padding */}
                                <div className="p-5 pb-8">

                                    {/* Header Section */}
                                    <div className="text-center mb-6">
                                        <h2 className="text-sm font-bold mb-1 tracking-tight uppercase break-words">{data.merchantName || 'Satıcı Firma'}</h2>

                                        {data.merchantAddress && (
                                            <p className="px-1 mb-2 text-[10px] text-gray-600 uppercase break-words leading-tight">{data.merchantAddress}</p>
                                        )}

                                        <div className="flex flex-col items-center text-[9px] font-medium text-gray-500 space-y-0.5 uppercase">
                                            {data.taxOffice && <span>{data.taxOffice} V.D.</span>}
                                            {data.taxNumber && <span>VKN: {data.taxNumber}</span>}
                                            {data.sicilNumber && <span>MERSİS: {data.sicilNumber}</span>}
                                        </div>
                                    </div>

                                    {/* Date & Meta */}
                                    <div className="flex flex-col mb-4 text-[10px] font-medium border-b border-gray-200 pb-2 text-gray-700">
                                        <div className="flex justify-between">
                                            {data.date && <span>TARİH: {fmtDate(data.date)}</span>}
                                            {data.time && <span>SAAT: {data.time}</span>}
                                        </div>
                                        <div className="flex justify-between mt-0.5">
                                            {data.invoiceNumber && <span>FİŞ NO: {data.invoiceNumber}</span>}
                                        </div>
                                    </div>

                                    {/* Items Header */}
                                    <div className="grid grid-cols-12 gap-1 mb-2 text-[9px] font-bold text-gray-400 border-b border-gray-200 pb-1">
                                        <span className="col-span-1">*</span>
                                        <span className="col-span-6">ÜRÜN ADI</span>
                                        <span className="col-span-2 text-left">%KDV</span>
                                        <span className="col-span-3 text-right">TUTAR</span>
                                    </div>

                                    {/* Items List */}
                                    <div className="flex flex-col gap-2 mb-6">
                                        {data.items?.map((item, idx) => (
                                            <div key={idx} className="flex flex-col text-[10px]">
                                                <div className="flex justify-between items-start font-semibold">
                                                    <span className="uppercase">{item.description}</span>
                                                </div>
                                                <div className="grid grid-cols-12 gap-1 items-baseline mt-0.5 text-gray-600 text-[9px]">
                                                    {/* Qty x Price */}
                                                    <div className="col-span-7">
                                                        {fmtQty(item.quantity)} x {fmtCurrency(item.unitPrice)}
                                                    </div>
                                                    {/* VAT Rate (Moved Closer to Product/Left) */}
                                                    <div className="col-span-2 text-left">%{fmtRate(item.vatRate)}</div>
                                                    {/* Total Price (More space) */}
                                                    <div className="col-span-3 text-right font-bold text-black">*{fmtCurrency(item.totalPrice)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Totals Section */}
                                    <div className="bg-gray-50 p-3 rounded-sm mb-4 space-y-1 print:bg-transparent print:border print:border-gray-200 print:break-inside-avoid">
                                        <div className="flex justify-between font-bold text-[10px] text-gray-600">
                                            <span>ARA TOPLAM</span>
                                            <span>*{fmtCurrency(data.subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-[10px] text-gray-600">
                                            <span>TOPKDV</span>
                                            <span>*{fmtCurrency(data.tax)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-sm mt-2 border-t border-gray-200 pt-2 text-black">
                                            <span>TOPLAM</span>
                                            <span>*{fmtCurrency(data.total)}</span>
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    {data.paymentMethod && (
                                        <div className="border-b border-dashed border-gray-300 pb-3 mb-4">
                                            <div className="flex justify-between uppercase font-bold text-[10px]">
                                                <span>{data.paymentMethod}</span>
                                                <span>*{fmtCurrency(data.total)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tax Breakdown Table */}
                                    {data.taxBreakdown && data.taxBreakdown.length > 0 && (
                                        <div className="mb-6 text-[9px] print:break-inside-avoid">
                                            <div className="grid grid-cols-3 border-b border-gray-300 mb-1 pb-1 font-bold text-gray-500">
                                                <span>KDV</span>
                                                <span className="text-center">MATRAH</span>
                                                <span className="text-right">TUTAR</span>
                                            </div>
                                            {data.taxBreakdown.map((tx, i) => (
                                                <div key={i} className="grid grid-cols-3 py-0.5">
                                                    <span className="font-medium">%{fmtRate(tx.rate)}</span>
                                                    <span className="text-center text-gray-600">*{fmtCurrency(tx.base)}</span>
                                                    <span className="text-right text-gray-600">*{fmtCurrency(tx.amount)}</span>
                                                </div>
                                            ))}
                                            <div className="grid grid-cols-3 border-t border-gray-300 mt-1 pt-1 font-bold">
                                                <span>TOP</span>
                                                <span className="text-center">*{fmtCurrency(data.subtotal)}</span>
                                                <span className="text-right">*{fmtCurrency(data.tax)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer Info */}
                                    <div className="text-center space-y-1 uppercase text-[9px] text-gray-500 font-medium">
                                        {data.cashier && <p>KASİYER: {data.cashier}</p>}
                                        <div className="flex justify-center gap-4 mt-2">
                                            {data.zNumber && <span>Z NO: {data.zNumber}</span>}
                                            {data.ekuNumber && <span>EKU NO: {data.ekuNumber}</span>}
                                        </div>
                                    </div>

                                    {/* GIB Logo Bottom for Receipt (Larger + Grayscale) */}
                                    <div className="mt-8 flex flex-col items-center justify-center space-y-2">
                                        <img
                                            src={LOGO_URL}
                                            alt="GİB Logo"
                                            className="h-16 w-auto grayscale opacity-90"
                                        />
                                        <p className="font-bold text-[9px] uppercase">Gelir İdaresi Başkanlığı</p>
                                    </div>

                                    <div className="mt-6 text-center">
                                        <p className="italic text-[9px] text-gray-400">Mali Değeri Vardır</p>
                                        <p className="font-bold mt-1 text-xs">TEŞEKKÜRLER</p>
                                    </div>

                                </div>

                                {/* Tear Off Effect Bottom (Hidden in print) */}
                                <div className="absolute bottom-0 left-0 right-0 h-2 print:hidden" style={{
                                    background: 'linear-gradient(45deg, transparent 33.333%, #ffffff 33.333%, #ffffff 66.667%, transparent 66.667%), linear-gradient(-45deg, transparent 33.333%, #ffffff 33.333%, #ffffff 66.667%, transparent 66.667%)',
                                    backgroundSize: '12px 24px',
                                    backgroundPosition: '0 12px'
                                }}></div>
                            </div>
                        </div>
                    )}

                    {/* =======================
            INVOICE VIEW (A4 Minimalist)
           ======================= */}
                    {viewMode === 'invoice' && (
                        <div className="invoice-print-wrapper">
                            <div className="printable-area w-full max-w-[700px] bg-white shadow-sm border border-gray-200 p-10 text-gray-900 font-sans text-[10px] animate-in fade-in zoom-in-95 duration-300 self-start min-h-[842px] relative flex flex-col print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full print:absolute print:top-0 print:left-0">

                                {/* 3-Column Header Grid */}
                                <div className="grid grid-cols-3 gap-6 mb-10 border-b border-gray-100 pb-8 items-start">

                                    {/* Column 1: Merchant Info */}
                                    <div className="text-left order-1">
                                        <h1 className="text-sm font-bold uppercase tracking-wide text-black mb-1.5 break-words">{data.merchantName || 'Satıcı Firma'}</h1>
                                        <div className="text-gray-500 leading-tight space-y-1">
                                            {data.merchantAddress && <p className="max-w-[200px]">{data.merchantAddress}</p>}
                                            <div className="flex flex-col gap-0.5 mt-2 text-[9px] uppercase tracking-wide text-gray-400 font-medium">
                                                {data.taxNumber && <span>VKN: {data.taxNumber}</span>}
                                                {data.taxOffice && <span>VD: {data.taxOffice}</span>}
                                                {data.sicilNumber && <span>MERSİS: {data.sicilNumber}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Logo (Centered, Larger, Colored) */}
                                    <div className="flex justify-center items-start pt-1 order-2">
                                        <img src={LOGO_URL} alt="GİB" className="h-20 w-auto object-contain" />
                                    </div>

                                    {/* Column 3: Invoice Details (Text aligned left within right block) */}
                                    <div className="flex flex-col items-end pl-4 order-3">
                                        {/* Generic Large "FATURA" Title */}
                                        <h2 className="text-5xl font-black text-gray-200 tracking-widest opacity-30 select-none mb-4">FATURA</h2>

                                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-gray-500 text-left w-full max-w-[180px]">
                                            {data.date && (
                                                <>
                                                    <span className="font-medium text-gray-700">Tarih:</span>
                                                    <span>{fmtDate(data.date)}</span>
                                                </>
                                            )}
                                            {data.time && (
                                                <>
                                                    <span className="font-medium text-gray-700">Saat:</span>
                                                    <span>{data.time}</span>
                                                </>
                                            )}
                                            {data.invoiceNumber && (
                                                <>
                                                    <span className="font-medium text-gray-700">Fatura No:</span>
                                                    <span>{data.invoiceNumber}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Section */}
                                <div className="mb-8 p-4 bg-gray-50/50 rounded border border-gray-50 flex justify-between items-start print:bg-transparent print:border-gray-200">
                                    <div>
                                        <p className="text-gray-400 uppercase tracking-widest text-[9px] mb-1 font-bold">Sayın Müşteri</p>
                                        <p className="font-semibold text-black text-xs">Muhtelif Müşteri (Nihai Tüketici)</p>
                                        <p className="text-gray-400 mt-1">Türkiye</p>
                                    </div>
                                    {data.paymentMethod && (
                                        <div className="text-right text-gray-400">
                                            <p>Ödeme Yöntemi: <span className="text-gray-600 font-medium">{data.paymentMethod}</span></p>
                                        </div>
                                    )}
                                </div>

                                {/* Table */}
                                <div className="flex-1">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-gray-500 text-[9px] uppercase tracking-wider">
                                                <th className="py-2.5 font-semibold w-10 pl-2">#</th>
                                                <th className="py-2.5 font-semibold">Mal / Hizmet Tanımı</th>
                                                <th className="py-2.5 font-semibold text-center w-20">Miktar</th>
                                                <th className="py-2.5 font-semibold text-right w-24">Birim Fiyat</th>
                                                <th className="py-2.5 font-semibold text-right w-16">KDV</th>
                                                <th className="py-2.5 font-semibold text-right w-24 pr-2">Tutar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-700 text-[10px]">
                                            {data.items?.map((item, i) => (
                                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors print:border-gray-200">
                                                    <td className="py-3 pl-2 text-gray-300">{i + 1}</td>
                                                    <td className="py-3 font-medium text-black">{item.description}</td>
                                                    <td className="py-3 text-center">{fmtQty(item.quantity)}</td>
                                                    <td className="py-3 text-right font-mono text-gray-600">{fmtCurrency(item.unitPrice)} ₺</td>
                                                    <td className="py-3 text-right text-gray-400">%{fmtRate(item.vatRate)}</td>
                                                    <td className="py-3 text-right font-mono font-medium text-black pr-2">{fmtCurrency(item.totalPrice)} ₺</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer Totals */}
                                <div className="mt-8 pt-6 flex justify-end print:break-inside-avoid">
                                    <div className="w-56 space-y-2">
                                        <div className="flex justify-between text-gray-500">
                                            <span>Ara Toplam</span>
                                            <span className="font-mono text-gray-700">{fmtCurrency(data.subtotal)} ₺</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>Toplam KDV</span>
                                            <span className="font-mono text-gray-700">{fmtCurrency(data.tax)} ₺</span>
                                        </div>
                                        <div className="flex justify-between text-black font-bold text-sm border-t border-gray-200 pt-3 mt-2 items-center">
                                            <span>GENEL TOPLAM</span>
                                            <span className="font-mono text-base">{fmtCurrency(data.total)} ₺</span>
                                        </div>

                                        <div className="text-[9px] text-gray-400 text-right mt-1 italic">
                                            {data.totalInWords || `Yalnız: #${fmtCurrency(data.total)}# Türk Lirası`}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Branding / Disclaimer (Larger, Grayscale) */}
                                <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col items-center justify-center text-center print:break-inside-avoid">
                                    <img src={LOGO_URL} className="h-10 w-auto opacity-30 grayscale mb-2" />
                                    <p className="text-[8px] text-gray-300 uppercase tracking-widest max-w-md">
                                        Bu belge 507 sayılı Vergi Usul Kanunu Genel Tebliği uyarınca akıllı cihazlar kullanılarak elektronik ortamda oluşturulmuştur ve ıslak imza gerektirmez.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ReceiptViewer;