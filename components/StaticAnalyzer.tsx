import React, { useState, useMemo } from 'react';
import { analyzeCode, AnalysisMode } from '../services/geminiService';
import { StaticAnalysisResult, Severity, HistoryItem } from '../types';

interface StaticAnalyzerProps {
  onAnalysisComplete?: (item: HistoryItem) => void;
}

const StaticAnalyzer: React.FC<StaticAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [code, setCode] = useState<string>(`// Вставьте ваш React компонент сюда
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
  const [mode, setMode] = useState<AnalysisMode>('RULES');
  
  // Filter States
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('LINE_ASC');

  // Helper to extract component name for dashboard
  const extractComponentName = (sourceCode: string): string => {
    const exportMatch = sourceCode.match(/export\s+default\s+(\w+)/);
    if (exportMatch) return exportMatch[1];
    
    const funcMatch = sourceCode.match(/const\s+(\w+)\s*=\s*\(/);
    if (funcMatch) return funcMatch[1];

    const functionMatch = sourceCode.match(/function\s+(\w+)\s*\(/);
    if (functionMatch) return functionMatch[1];
    
    return `Component ${new Date().toLocaleTimeString()}`;
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const analysis = await analyzeCode(code, mode);
      setResult(analysis);

      // Report to Dashboard
      if (onAnalysisComplete) {
        // Aggregate categories
        const categories: Record<string, number> = {};
        analysis.issues.forEach(i => {
            categories[i.category] = (categories[i.category] || 0) + 1;
        });

        const historyItem: HistoryItem = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'STATIC',
            name: extractComponentName(code),
            score: analysis.score,
            issuesCount: analysis.issues.length,
            categories
        };
        onAnalysisComplete(historyItem);
      }

    } catch (err) {
      console.error(err);
      alert("Анализ не удался. Проверьте консоль.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!result) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      mode: mode,
      score: result.score,
      summary: result.summary,
      issues: result.issues,
      sourceCode: code
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `static-analysis-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const translateSeverity = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'КРИТИЧЕСКИЙ';
      case 'HIGH': return 'ВЫСОКИЙ';
      case 'MEDIUM': return 'СРЕДНИЙ';
      case 'LOW': return 'НИЗКИЙ';
      default: return sev;
    }
  };

  const translateCategory = (cat: string) => {
    switch (cat) {
      case 'ACCESSIBILITY': return 'ДОСТУПНОСТЬ';
      case 'PERFORMANCE': return 'ПРОИЗВОДИТЕЛЬНОСТЬ';
      case 'BEST_PRACTICE': return 'ЛУЧШИЕ ПРАКТИКИ';
      case 'LOGIC': return 'ЛОГИКА';
      default: return cat;
    }
  };

  const filteredIssues = useMemo(() => {
    if (!result || !result.issues) return [];

    let issues = [...result.issues];

    // Filter
    if (filterSeverity !== 'ALL') {
      issues = issues.filter(i => i.severity === filterSeverity);
    }
    if (filterCategory !== 'ALL') {
      issues = issues.filter(i => i.category === filterCategory);
    }

    // Sort
    issues.sort((a, b) => {
      if (sortBy === 'SEVERITY_DESC') {
        const weights: Record<string, number> = { 
          [Severity.CRITICAL]: 4, 
          [Severity.HIGH]: 3, 
          [Severity.MEDIUM]: 2, 
          [Severity.LOW]: 1 
        };
        const weightA = weights[a.severity] || 0;
        const weightB = weights[b.severity] || 0;
        // If weights are equal, fallback to line number
        if (weightB !== weightA) return weightB - weightA;
        return (a.line || 0) - (b.line || 0);
      } else {
        // LINE_ASC
        return (a.line || 0) - (b.line || 0);
      }
    });

    return issues;
  }, [result, filterSeverity, filterCategory, sortBy]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Input Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white">Исходный код</h2>
          
          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="bg-slate-900 p-1 rounded-lg border border-slate-700 flex">
              <button
                onClick={() => setMode('RULES')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  mode === 'RULES' 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Правила
              </button>
              <button
                onClick={() => setMode('AI')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center gap-1 ${
                  mode === 'AI' 
                    ? 'bg-purple-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>AI Gemini</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                loading
                  ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                  : mode === 'AI' 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              }`}
            >
              {loading ? (mode === 'AI' ? 'AI думает...' : 'Анализ...') : 'Запустить'}
            </button>
          </div>
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
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Отчет об анализе</h2>
            {result && (
                <button 
                    onClick={handleExportReport}
                    className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors text-sm font-medium"
                    title="Скачать отчет в JSON"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Экспорт JSON
                </button>
            )}
        </div>
        
        {!result && !loading && (
          <div className="flex-1 bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500">
            <p>Выберите режим и запустите анализ для получения отчета</p>
          </div>
        )}

        {loading && (
          <div className="flex-1 bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className={`w-8 h-8 border-4 ${mode === 'AI' ? 'border-purple-500' : 'border-indigo-500'} border-t-transparent rounded-full animate-spin`}></div>
              <p className={`${mode === 'AI' ? 'text-purple-400' : 'text-indigo-400'} animate-pulse`}>
                 {mode === 'AI' ? 'Gemini анализирует контекст...' : 'Проверка правил...'}
              </p>
            </div>
          </div>
        )}

        {result && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Score Card */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-slate-400 text-sm">Оценка качества</h3>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <h3 className="text-lg font-semibold text-white">Обнаруженные проблемы</h3>
                
                {/* Filters */}
                {result.issues && result.issues.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                      className="bg-slate-900 text-slate-300 text-xs rounded border border-slate-700 px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">Важность: Все</option>
                      <option value={Severity.CRITICAL}>Критический</option>
                      <option value={Severity.HIGH}>Высокий</option>
                      <option value={Severity.MEDIUM}>Средний</option>
                      <option value={Severity.LOW}>Низкий</option>
                    </select>

                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="bg-slate-900 text-slate-300 text-xs rounded border border-slate-700 px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">Категория: Все</option>
                      <option value="ACCESSIBILITY">Доступность</option>
                      <option value="PERFORMANCE">Производительность</option>
                      <option value="BEST_PRACTICE">Лучшие практики</option>
                      <option value="LOGIC">Логика</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-slate-900 text-slate-300 text-xs rounded border border-slate-700 px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="LINE_ASC">Сорт: Строка</option>
                      <option value="SEVERITY_DESC">Сорт: Важность</option>
                    </select>
                  </div>
                )}
              </div>

              {(!result.issues || result.issues.length === 0) && (
                <p className="text-emerald-400">Проблем не обнаружено! Отличная работа.</p>
              )}
              
              {result.issues && result.issues.length > 0 && filteredIssues.length === 0 && (
                <div className="p-8 text-center border border-dashed border-slate-700 rounded-xl">
                  <p className="text-slate-500">Нет проблем, соответствующих выбранным фильтрам.</p>
                  <button 
                    onClick={() => { setFilterSeverity('ALL'); setFilterCategory('ALL'); }}
                    className="text-indigo-400 text-sm mt-2 hover:underline"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              )}

              {filteredIssues.map((issue) => (
                <div key={issue.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors animate-fade-in">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSeverityColor(issue.severity)}`}>
                      {translateSeverity(issue.severity)}
                    </span>
                    <span className="text-xs text-slate-500">Строка {issue.line || 'N/A'}</span>
                  </div>
                  <p className="text-slate-200 font-medium mb-1">{issue.message}</p>
                  <p className="text-slate-400 text-sm mb-3">{issue.suggestion}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-slate-900 rounded text-slate-500">{translateCategory(issue.category)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Optimized Code */}
            {result.optimizedCode && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                    {mode === 'AI' ? 'Рекомендованный код (AI)' : 'Быстрые исправления'}
                </h3>
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