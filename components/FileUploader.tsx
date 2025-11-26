import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileType, X, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface FileUploaderProps {
  onInputSelect: (input: File | string) => void;
  selectedInput: File | string | null;
  onClear: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onInputSelect, selectedInput, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Handle Global Paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (selectedInput) return; // Don't override if something is already selected

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            onInputSelect(file);
            e.preventDefault();
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onInputSelect, selectedInput]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onInputSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onInputSelect(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onInputSelect(urlInput.trim());
    }
  };

  if (selectedInput) {
    const isFile = selectedInput instanceof File;
    const name = isFile ? selectedInput.name : selectedInput.toString().split('/').pop() || 'Remote Image';
    const size = isFile ? (selectedInput.size / 1024 / 1024).toFixed(2) + ' MB' : 'URL Kaynağı';

    return (
      <div className="w-full bg-white border border-mistral-black p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0">
             {isFile ? <FileType size={18} className="text-mistral-black" /> : <LinkIcon size={18} className="text-blue-500" />}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-medium text-xs truncate max-w-[180px]" title={isFile ? name : selectedInput as string}>{name}</span>
            <span className="text-[10px] text-gray-500 font-mono">{size}</span>
          </div>
        </div>
        <button 
          onClick={() => { onClear(); setUrlInput(''); }}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          w-full h-32 border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-2
          ${isDragging 
            ? 'border-mistral-black bg-gray-50 scale-[0.99]' 
            : 'border-gray-300 hover:border-gray-400 bg-white'
          }
        `}
      >
        <input 
          type="file" 
          ref={inputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".pdf,.jpg,.jpeg,.png,.docx,.pptx"
        />
        
        <div className={`p-2 rounded-full ${isDragging ? 'bg-white' : 'bg-gray-50'}`}>
          <UploadCloud size={20} className="text-mistral-black" />
        </div>
        
        <div className="text-center px-4">
          <p className="text-xs font-medium text-gray-900">
            Dosya yüklemek için tıklayın
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">
            PDF, JPG, PNG (Maks 50MB)
          </p>
        </div>
      </div>

      {/* URL Input or Paste Prompt */}
      <div className="flex items-center gap-2 h-9">
         <div className="flex-1 relative h-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon size={14} className="text-gray-400" />
            </div>
            <form onSubmit={handleUrlSubmit} className="h-full">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Veya görsel URL'si yapıştırın..."
                className="w-full h-full pl-9 pr-3 text-xs border border-gray-300 bg-white focus:border-mistral-black focus:ring-0 outline-none transition-colors"
              />
            </form>
         </div>
         <div className="hidden md:flex items-center justify-center h-full w-10 bg-gray-100 text-gray-400 border border-gray-200 rounded-sm text-[10px] font-bold" title="Yapıştırmak için Ctrl+V (Cmd+V)">
             <span className="font-mono">⌘V</span>
         </div>
      </div>
    </div>
  );
};

export default FileUploader;