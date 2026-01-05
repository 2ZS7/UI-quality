import React, { useState, useRef, useEffect } from 'react';
import { compareImages, imageDataToDataUrl } from '../services/imageUtils';
import { analyzeVisualDiff } from '../services/geminiService';
import { VisualDiffResult } from '../types';

const VisualTester: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [compareImage, setCompareImage] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<VisualDiffResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState<number>(0.1);

  const fileInputBase = useRef<HTMLInputElement>(null);
  const fileInputCompare = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'compare') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (type === 'base') setBaseImage(ev.target?.result as string);
        else setCompareImage(ev.target?.result as string);
        
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

      // 2. Ensure dimensions match (basic scaling for demo, ideally should be exact)
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

      // 3. Compute Diff
      const { diffPercentage, diffImageData } = compareImages(img1Data, img2Data);
      const diffUrl = imageDataToDataUrl(diffImageData);

      // 4. Send to AI for Qualitative Analysis
      const aiAnalysis = await analyzeVisualDiff(baseImage, compareImage, diffPercentage);

      setDiffResult({
        diffPercentage,
        diffImageUrl: diffUrl,
        aiAnalysis,
        isPassed: diffPercentage <= threshold
      });

    } catch (err) {
      console.error(err);
      alert("Failed to process visual regression.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isPassed = diffResult ? diffResult.diffPercentage <= threshold : false;

  return (
    <div className="flex flex-col gap-8">
      {/* Upload Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                Change Baseline
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
              <p className="text-slate-300 font-medium">Upload Baseline</p>
              <p className="text-slate-500 text-sm mt-1">Expected Image</p>
            </div>
          )}
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center border-dashed border-2 border-slate-600 hover:border-slate-500 transition-colors relative group">
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
                Change Current
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
              <p className="text-slate-300 font-medium">Upload Actual</p>
              <p className="text-slate-500 text-sm mt-1">Current Implementation</p>
            </div>
          )}
        </div>
      </div>

      {/* Threshold Configuration */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-white">Threshold Sensitivity</h3>
            <p className="text-xs text-slate-400">Adjust acceptable pixel difference percentage</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700 w-full md:w-auto">
            <span className="text-sm text-slate-400 font-medium whitespace-nowrap">Tolerance:</span>
            <input 
              type="range" 
              min="0" 
              max="5" 
              step="0.01" 
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full md:w-48 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-sm font-mono text-indigo-400 w-16 text-right">{threshold.toFixed(2)}%</span>
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
          {isProcessing ? 'Comparing Pixels & AI Analysis...' : 'Run Visual Comparison'}
        </button>
      </div>

      {/* Results */}
      {diffResult && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Diff View */}
            <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden relative">
              <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur px-3 py-1 rounded text-xs font-mono text-white">
                DIFF MAP
              </div>
              <div className="p-4 flex items-center justify-center bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAjyQcRNUIdA0ALy8DADsOrREAAAAASUVORK5CYII=')]">
                <img src={diffResult.diffImageUrl} alt="Diff" className="max-w-full border border-slate-700 shadow-2xl" />
              </div>
            </div>

            {/* Analysis Stats */}
            <div className="flex flex-col gap-6">
              <div className={`p-6 rounded-xl border-2 ${isPassed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold">Match Status</h3>
                <p className={`text-4xl font-bold mt-2 ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPassed ? 'PASSED' : 'REGRESSION'}
                </p>
                <p className="text-slate-300 mt-2">
                  <span className="font-mono text-xl">{diffResult.diffPercentage.toFixed(2)}%</span> Difference
                </p>
              </div>

              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex-1">
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                   <h3 className="text-lg font-semibold text-white">AI Insight</h3>
                </div>
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {diffResult.aiAnalysis}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualTester;