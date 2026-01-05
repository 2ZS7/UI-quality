import React, { useState } from 'react';
import { analyzeCode } from '../services/geminiService';
import { StaticAnalysisResult, Severity } from '../types';

const StaticAnalyzer: React.FC = () => {
  const [code, setCode] = useState<string>(`// Paste your React component here
import React from 'react';

const Button = ({ label }) => {
  return (
    <div onClick={() => alert('clicked')} className="btn-primary">
      {label}
    </div>
  )
}
export default Button;`);
  const [result, setResult] = useState<StaticAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const analysis = await analyzeCode(code);
      setResult(analysis);
    } catch (err) {
      alert("Analysis failed. Please check your API Key.");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: Severity) => {
    switch (sev) {
      case Severity.CRITICAL: return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case Severity.HIGH: return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case Severity.MEDIUM: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case Severity.LOW: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Input Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Source Code</h2>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              loading
                ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {loading ? 'Analyzing...' : 'Run Static Analysis'}
          </button>
        </div>
        <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-sm overflow-hidden relative">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-[600px] bg-transparent text-slate-300 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">Analysis Report</h2>
        
        {!result && !loading && (
          <div className="flex-1 bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500">
            <p>Run analysis to see quality report</p>
          </div>
        )}

        {loading && (
          <div className="flex-1 bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-indigo-400 animate-pulse">Consulting AI Knowledge Base...</p>
            </div>
          </div>
        )}

        {result && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Score Card */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-slate-400 text-sm">Quality Score</h3>
                  <p className="text-slate-300 mt-1">{result.summary}</p>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 ${
                  result.score > 80 ? 'border-emerald-500 text-emerald-400' :
                  result.score > 50 ? 'border-yellow-500 text-yellow-400' : 'border-rose-500 text-rose-400'
                }`}>
                  {result.score}
                </div>
              </div>
            </div>

            {/* Issues List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Detected Issues</h3>
              {(!result.issues || result.issues.length === 0) && (
                <p className="text-emerald-400">No issues found! Great job.</p>
              )}
              {result.issues?.map((issue) => (
                <div key={issue.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSeverityColor(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className="text-xs text-slate-500">Line {issue.line || 'N/A'}</span>
                  </div>
                  <p className="text-slate-200 font-medium mb-1">{issue.message}</p>
                  <p className="text-slate-400 text-sm mb-3">{issue.suggestion}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-slate-900 rounded text-slate-500">{issue.category}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Optimized Code */}
            {result.optimizedCode && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Suggested Refactor</h3>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                  <pre>{result.optimizedCode}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticAnalyzer;