import React, { useState, useRef, useEffect } from 'react';
import { compareImages, imageDataToDataUrl, IgnoreRegion, ComparisonMethod } from '../services/imageUtils';
import { VisualDiffResult, HistoryItem } from '../types';

interface VisualTesterProps {
  onTestComplete?: (item: HistoryItem) => void;
}

const VisualTester: React.FC<VisualTesterProps> = ({ onTestComplete }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [compareImage, setCompareImage] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<VisualDiffResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState<number>(0.1);
  const [method, setMethod] = useState<ComparisonMethod>('PIXEL');
  
  // Ignore Region State
  const [ignoreRegions, setIgnoreRegions] = useState<IgnoreRegion[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorRect, setEditorRect] = useState<IgnoreRegion | null>(null); // Current drawing rect
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);

  const fileInputBase = useRef<HTMLInputElement>(null);
  const fileInputCompare = useRef<HTMLInputElement>(null);
  const editorImageRef = useRef<HTMLImageElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'compare') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (type === 'base') {
           setBaseImage(ev.target?.result as string);
           setIgnoreRegions([]); // Reset regions on new base image
        } else {
           setCompareImage(ev.target?.result as string);
        }
        
        // Reset results on new upload
        setDiffResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runVisualTest = async () => {
    if (!baseImage || !compareImage) return;

    setIsProcessing(true);
    try {
      // 1. Load images into HTMLImageElements
      const img1 = new Image();
      const img2 = new Image();
      
      await Promise.all([
        new Promise(resolve => { img1.onload = resolve; img1.src = baseImage; }),
        new Promise(resolve => { img2.onload = resolve; img2.src = compareImage; })
      ]);

      // 2. Ensure dimensions match
      const width = Math.max(img1.width, img2.width);
      const height = Math.max(img1.height, img2.height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");

      // Draw Base
      ctx.drawImage(img1, 0, 0, width, height);
      const img1Data = ctx.getImageData(0, 0, width, height);

      // Draw Compare
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img2, 0, 0, width, height);
      const img2Data = ctx.getImageData(0, 0, width, height);

      // 3. Compute Diff with Ignore Regions and selected Method
      const { diffPercentage, diffImageData } = compareImages(img1Data, img2Data, ignoreRegions, method);
      const diffUrl = imageDataToDataUrl(diffImageData);
      
      const isPassed = diffPercentage <= threshold;

      setDiffResult({
        diffPercentage,
        diffImageUrl: diffUrl,
        isPassed
      });

      // Report to Dashboard
      if (onTestComplete) {
        // Use filename from input if available, else generic name
        let name = "Снимок экрана";
        if (fileInputCompare.current?.files?.[0]) {
             name = fileInputCompare.current.files[0].name;
        }

        onTestComplete({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'VISUAL',
            name: name,
            diffPercentage: diffPercentage,
            passed: isPassed
        });
      }

    } catch (err) {
      console.error(err);
      alert("Не удалось выполнить визуальную регрессию.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadReport = () => {
    if (!diffResult) return;
    const report = {
      timestamp: new Date().toISOString(),
      diffPercentage: diffResult.diffPercentage,
      isPassed: diffResult.isPassed,
      threshold,
      method,
      ignoredRegionsCount: ignoreRegions.length
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visual-test-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDiffImage = () => {
    if (!diffResult) return;
    const link = document.createElement('a');
    link.href = diffResult.diffImageUrl;
    link.download = `diff-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Region Editor Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editorImageRef.current) return;
    const rect = editorImageRef.current.getBoundingClientRect();
    
    // Calculate relative coordinates
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Ensure we are clicking strictly inside the image bounds
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        return;
    }

    setStartPos({ x, y });
    setIsDrawing(true);
    // Initialize rect immediately
    setEditorRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos || !editorImageRef.current) return;
    const rect = editorImageRef.current.getBoundingClientRect();
    
    // Get raw relative coordinates
    let currentX = e.clientX - rect.left;
    let currentY = e.clientY - rect.top;

    // Clamp coordinates to stay within image bounds
    currentX = Math.max(0, Math.min(currentX, rect.width));
    currentY = Math.max(0, Math.min(currentY, rect.height));

    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);
    const x = Math.min(currentX, startPos.x);
    const y = Math.min(currentY, startPos.y);

    setEditorRect({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !editorRect || !editorImageRef.current) {
        setIsDrawing(false);
        setEditorRect(null);
        setStartPos(null);
        return;
    }

    // Filter out accidental tiny clicks (< 5px)
    if (editorRect.width < 5 || editorRect.height < 5) {
        setIsDrawing(false);
        setEditorRect(null);
        setStartPos(null);
        return;
    }

    // Convert CSS coordinates to Intrinsic Image coordinates
    const displayWidth = editorImageRef.current.width;
    const displayHeight = editorImageRef.current.height;
    const intrinsicWidth = editorImageRef.current.naturalWidth;
    const intrinsicHeight = editorImageRef.current.naturalHeight;

    const scaleX = intrinsicWidth / displayWidth;
    const scaleY = intrinsicHeight / displayHeight;

    const newRegion: IgnoreRegion = {
        x: Math.round(editorRect.x * scaleX),
        y: Math.round(editorRect.y * scaleY),
        width: Math.round(editorRect.width * scaleX),
        height: Math.round(editorRect.height * scaleY)
    };

    setIgnoreRegions([...ignoreRegions, newRegion]);
    setIsDrawing(false);
    setEditorRect(null);
    setStartPos(null);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Upload Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Base Image Upload */}
        <div className="flex flex-col gap-2">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center border-dashed border-2 border-slate-600 hover:border-slate-500 transition-colors relative group">
            <input 
                type="file" 
                ref={fileInputBase} 
                onChange={(e) => handleImageUpload(e, 'base')} 
                className="hidden" 
                accept="image/*" 
            />
            {baseImage ? (
                <div className="relative w-full h-48 flex items-center justify-center">
                <img src={baseImage} alt="Baseline" className="max-h-full max-w-full object-contain rounded" />
                <button 
                    onClick={() => fileInputBase.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-medium transition-opacity rounded"
                >
                    Изменить эталон
                </button>
                </div>
            ) : (
                <div 
                onClick={() => fileInputBase.current?.click()}
                className="cursor-pointer text-center"
                >
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 mb-3 group-hover:bg-slate-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-slate-300 font-medium">Загрузить эталон</p>
                <p className="text-slate-500 text-sm mt-1">Ожидаемое изображение</p>
                </div>
            )}
            </div>
            {baseImage && (
                <button 
                    onClick={() => setIsEditorOpen(true)}
                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {ignoreRegions.length > 0 ? `Зоны исключения: ${ignoreRegions.length}` : 'Настроить зоны исключения'}
                </button>
            )}
        </div>

        {/* Compare Image Upload */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center border-dashed border-2 border-slate-600 hover:border-slate-500 transition-colors relative group h-[250px]">
          <input 
            type="file" 
            ref={fileInputCompare} 
            onChange={(e) => handleImageUpload(e, 'compare')} 
            className="hidden" 
            accept="image/*" 
          />
          {compareImage ? (
            <div className="relative w-full h-48 flex items-center justify-center">
              <img src={compareImage} alt="Current" className="max-h-full max-w-full object-contain rounded" />
              <button 
                onClick={() => fileInputCompare.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-medium transition-opacity rounded"
              >
                Изменить текущий
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputCompare.current?.click()}
              className="cursor-pointer text-center"
            >
               <div className="mx-auto w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 mb-3 group-hover:bg-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-slate-300 font-medium">Загрузить текущий</p>
              <p className="text-slate-500 text-sm mt-1">Текущая реализация</p>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Method Selector */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Метод сравнения</label>
          <select 
            value={method}
            onChange={(e) => setMethod(e.target.value as ComparisonMethod)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="PIXEL">Попиксельный (Standard)</option>
            <option value="STRICT">Строгий (Strict)</option>
            <option value="LUMINANCE">Яркость (Luminance)</option>
          </select>
        </div>

        <div className="h-8 w-px bg-slate-700 hidden md:block"></div>

        {/* Threshold Slider */}
        <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-medium text-white text-sm">Порог допуска</h3>
                    <p className="text-[10px] text-slate-400">Макс. процент различий для успеха</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700 flex-1 w-full">
                <input 
                type="range" 
                min="0" 
                max="5" 
                step="0.01" 
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-sm font-mono text-indigo-400 w-12 text-right">{threshold.toFixed(2)}%</span>
            </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={runVisualTest}
          disabled={!baseImage || !compareImage || isProcessing}
          className={`px-8 py-3 rounded-full font-bold text-lg transition-all ${
            !baseImage || !compareImage
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : isProcessing 
                ? 'bg-slate-700 text-slate-300 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
          }`}
        >
          {isProcessing ? 'Обработка...' : 'Запустить сравнение'}
        </button>
      </div>

      {/* Results Section */}
      {diffResult && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-6">
             {/* Stats */}
             <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${diffResult.isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {diffResult.isPassed ? (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-white">{diffResult.isPassed ? 'Тест пройден' : 'Тест не пройден'}</h3>
                      <p className="text-slate-400 text-sm">Различие: <span className="text-white font-mono">{diffResult.diffPercentage.toFixed(4)}%</span> (Порог: {threshold}%)</p>
                   </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                   <button 
                     onClick={handleDownloadReport}
                     className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                   >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     Скачать отчет
                   </button>
                   <button 
                     onClick={handleDownloadDiffImage}
                     className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                   >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     Скачать изображение
                   </button>
                </div>
             </div>

             {/* Diff Image Display */}
             <div className="flex-1 bg-slate-900 rounded-lg p-2 border border-slate-700 flex items-center justify-center">
                <img src={diffResult.diffImageUrl} alt="Diff" className="max-w-full h-auto rounded" />
             </div>
          </div>
        </div>
      )}

      {/* Region Editor Modal */}
      {isEditorOpen && baseImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm animate-fade-in">
           <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden max-w-full max-h-full flex flex-col shadow-2xl">
              <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                 <div>
                    <h3 className="text-white font-bold">Редактор зон исключения</h3>
                    <p className="text-xs text-slate-400">Выделите области, которые нужно игнорировать при сравнении</p>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{ignoreRegions.length} зон(ы)</span>
                    <button onClick={() => setIgnoreRegions([])} className="text-rose-400 text-xs hover:underline">Сбросить все</button>
                    <button onClick={() => setIsEditorOpen(false)} className="bg-white text-slate-900 px-3 py-1 rounded font-bold text-sm hover:bg-slate-200">Готово</button>
                 </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                 <div className="relative inline-block cursor-crosshair select-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                    <img ref={editorImageRef} src={baseImage} alt="Editor Base" className="max-w-full pointer-events-none" draggable={false} />
                    {/* Render Current Drawing Rect */}
                    {editorRect && (
                        <div 
                          className="absolute border-2 border-rose-500 bg-rose-500/20"
                          style={{
                              left: editorRect.x,
                              top: editorRect.y,
                              width: editorRect.width,
                              height: editorRect.height
                          }}
                        />
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default VisualTester;