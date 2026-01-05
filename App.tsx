import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import StaticAnalyzer from './components/StaticAnalyzer';
import VisualTester from './components/VisualTester';
import { Tab, HistoryItem } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleStaticAnalysisComplete = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  };

  const handleVisualTestComplete = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.DASHBOARD:
        return <Dashboard history={history} />;
      case Tab.STATIC_ANALYSIS:
        return <StaticAnalyzer onAnalysisComplete={handleStaticAnalysisComplete} />;
      case Tab.VISUAL_REGRESSION:
        return <VisualTester onTestComplete={handleVisualTestComplete} />;
      default:
        return <Dashboard history={history} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">UI Guard</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab(Tab.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === Tab.DASHBOARD 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="font-medium">Дашборд</span>
          </button>

          <button
            onClick={() => setActiveTab(Tab.STATIC_ANALYSIS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === Tab.STATIC_ANALYSIS 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="font-medium">Статический анализ</span>
          </button>

          <button
            onClick={() => setActiveTab(Tab.VISUAL_REGRESSION)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === Tab.VISUAL_REGRESSION 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="font-medium">Визуальная регрессия</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="bg-slate-900 rounded-lg p-3">
             <p className="text-xs text-slate-500 mb-1">Статус</p>
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
               <span className="text-sm font-medium text-slate-300">Система работает</span>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-8">
          <h1 className="text-xl font-bold text-white">
            {activeTab === Tab.DASHBOARD && 'Обзор качества'}
            {activeTab === Tab.STATIC_ANALYSIS && 'Инспектор кода'}
            {activeTab === Tab.VISUAL_REGRESSION && 'Инструмент визуального сравнения'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">v1.1.0</span>
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-400">
               {history.length}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-8">
           <div className="max-w-7xl mx-auto h-full">
             {renderContent()}
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;