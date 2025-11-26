import React from 'react';
import { PRICING, ApiMode } from '../types';
import { Calculator, FileText, ScanLine, Layers, Zap, Bot } from 'lucide-react';

interface CostEstimatorProps {
  pageCount: number;
  isAnnotated: boolean;
  apiMode: ApiMode;
  status: string;
  className?: string;
  inputCharCount?: number; // For Gemini token estimation
  outputCharCount?: number; // For Gemini token estimation
}

const CostEstimator: React.FC<CostEstimatorProps> = ({ 
    pageCount, 
    isAnnotated, 
    apiMode, 
    status, 
    className = '',
    inputCharCount = 0,
    outputCharCount = 0
}) => {
  const activeTier = isAnnotated ? PRICING.ANNOTATION : PRICING.OCR;
  
  // Calculate Base Cost
  const baseCost = (pageCount / 1000) * activeTier.pricePer1k;
  
  // Apply Batch Discount (50% off)
  const discountFactor = apiMode === 'batch' ? 0.5 : 1;
  const totalOcrCost = baseCost * discountFactor;
  
  // Gemini Cost Estimation (Flash Lite 2.5 Pricing)
  // Input: $0.075 per 1 Million Tokens
  // Output: $0.30 per 1 Million Tokens
  // Approx 1 Token = 4 Characters
  const inputTokens = inputCharCount / 4;
  const outputTokens = outputCharCount / 4;
  
  const inputCost = (inputTokens / 1_000_000) * 0.075;
  const outputCost = (outputTokens / 1_000_000) * 0.30;
  
  const geminiCost = status === 'success' ? (inputCost + outputCost) : 0;
  
  const totalCost = totalOcrCost + geminiCost;

  // Format with high precision for micro-transactions
  const fmtCost = (val: number) => `$${val.toFixed(5)}`;

  return (
    <div className={`bg-white border border-mistral-black p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
        <h3 className="font-sans text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2 font-bold">
          <Calculator size={14} /> Maliyet Analizi
        </h3>
        <span className="font-sans text-xs text-mistral-black font-bold">
          v25.05
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          {/* OCR Mode */}
          <div className="flex flex-col">
             <span className="text-[10px] text-gray-500 font-sans uppercase">OCR Motoru</span>
             <div className="flex items-center gap-1.5 text-xs font-bold font-sans">
                {isAnnotated ? <ScanLine size={14}/> : <FileText size={14}/>}
                Mistral {activeTier.name}
             </div>
          </div>
          
          {/* Gemini Mode (Conditional) */}
          {status === 'success' && (
            <div className="flex flex-col animate-in fade-in duration-500">
               <span className="text-[10px] text-gray-500 font-sans uppercase">Ayrıştırma (GenAI)</span>
               <div className="flex items-center gap-1.5 text-xs font-bold font-sans text-blue-600">
                  <Bot size={14}/> Flash Lite 2.5
               </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end justify-center">
          <span className="text-xs text-gray-500 mb-1 font-sans">Tahmini Tutar</span>
          <div className="text-xl font-bold font-sans tracking-tight flex items-center gap-2">
            {apiMode === 'batch' && (
                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-sans uppercase">
                    BATCH
                </span>
            )}
            {totalCost < 0.01 ? fmtCost(totalCost) : `$${totalCost.toFixed(2)}`}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5 font-sans">
            {pageCount} Sayfa + {Math.round(inputTokens + outputTokens)} Token
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
        <div className="flex flex-col gap-1">
             <div className="flex justify-between text-[10px] font-sans text-gray-400">
                <div className="flex items-center gap-1">
                    {apiMode === 'batch' ? <Layers size={10}/> : <Zap size={10}/>}
                    <span>Mistral OCR ({apiMode === 'batch' ? '-50%' : 'Std'})</span>
                </div>
                <span>{fmtCost(totalOcrCost)}</span>
            </div>
            {status === 'success' && (
                <div className="flex justify-between text-[10px] font-sans text-blue-400">
                    <div className="flex items-center gap-1">
                        <Bot size={10}/>
                        <span>Gemini (In/Out)</span>
                    </div>
                    <span>{fmtCost(geminiCost)}</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CostEstimator;