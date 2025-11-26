import React, { useState } from 'react';
import { OCRResult, ViewMode } from '../types';
import { FileJson, FileText, Image as ImageIcon, Copy, Check, Eye } from 'lucide-react';
import { parse } from 'marked';

interface OutputViewerProps {
  result: OCRResult;
}

const OutputViewer: React.FC<OutputViewerProps> = ({ result }) => {
  const [mode, setMode] = useState<ViewMode>('markdown');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const content = mode === 'json' ? JSON.stringify(result.json, null, 2) : result.markdown;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe parsing of markdown
  const getRenderedMarkdown = () => {
    try {
      return parse(result.markdown || '');
    } catch (e) {
      return '<p>Markdown oluşturma hatası</p>';
    }
  };

  return (
    <div className="bg-white border border-mistral-black h-full flex flex-col shadow-sm animate-in fade-in duration-500 overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mistral-black bg-gray-50 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode('markdown')}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-2 ${
              mode === 'markdown' 
                ? 'bg-mistral-black text-white border-mistral-black' 
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            <FileText size={14} /> Markdown
          </button>
          
          <button
            onClick={() => setMode('rendered')}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-2 ${
              mode === 'rendered' 
                ? 'bg-mistral-black text-white border-mistral-black' 
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            <Eye size={14} /> Önizleme
          </button>

          <button
            onClick={() => setMode('json')}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-2 ${
              mode === 'json' 
                ? 'bg-mistral-black text-white border-mistral-black' 
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            <FileJson size={14} /> JSON Yapısı
          </button>
          
          {result.images && result.images.length > 0 && (
            <button
              onClick={() => setMode('images')}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-2 ${
                mode === 'images' 
                  ? 'bg-mistral-black text-white border-mistral-black' 
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              <ImageIcon size={14} /> Görseller
            </button>
          )}
        </div>
        
        <button 
          onClick={handleCopy}
          className="text-gray-500 hover:text-mistral-black transition-colors"
          title="Kopyala"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-white min-h-0 relative">
        {mode === 'markdown' && (
          <div className="p-6">
             <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-transparent border-none p-0 text-gray-800">
               {result.markdown}
             </pre>
          </div>
        )}

        {mode === 'rendered' && (
          <div className="p-8 prose prose-sm prose-slate max-w-none 
              prose-headings:font-bold prose-headings:text-mistral-black 
              prose-h1:text-2xl prose-h2:text-xl 
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-pre:text-gray-800
              prose-table:border-collapse prose-th:bg-gray-100 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-gray-200">
             <div dangerouslySetInnerHTML={{ __html: getRenderedMarkdown() as string }} />
          </div>
        )}

        {mode === 'json' && (
          <div className="p-4">
            <pre className="font-mono text-xs text-blue-700 bg-gray-50 p-4 rounded border border-gray-100 whitespace-pre-wrap break-all">
              {JSON.stringify(result.json, null, 2)}
            </pre>
          </div>
        )}

        {mode === 'images' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {result.images?.map((img, idx) => (
              <div key={idx} className="border border-gray-200 p-2 bg-gray-50 flex items-center justify-center">
                <img src={img} alt={`Extracted ${idx}`} className="max-w-full h-auto object-contain max-h-[300px]" />
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-[10px] font-mono text-gray-500 flex justify-between flex-shrink-0 z-10">
         <span>MODEL: {result.json?.model || 'mistral-ocr-2505'}</span>
         <span>SAYFA: {result.usage?.pages || 0}</span>
         <span>BOYUT: {result.json?.usage_info?.doc_size_bytes ? (result.json.usage_info.doc_size_bytes / 1024).toFixed(1) + ' KB' : 'N/A'}</span>
      </div>
    </div>
  );
};

export default OutputViewer;