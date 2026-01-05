import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { HistoryItem } from '../types';

interface DashboardProps {
  history: HistoryItem[];
}

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981'];

const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  
  const stats = useMemo(() => {
    const staticItems = history.filter(h => h.type === 'STATIC');
    
    // 1. Group by component name to find the LATEST analysis for each unique component
    // This prevents double-counting issues in the Pie Chart and Avg Score
    const latestRunsMap = new Map<string, HistoryItem>();
    
    staticItems.forEach(item => {
      const existing = latestRunsMap.get(item.name);
      // Provided history is usually new-to-old, but we check timestamps to be sure
      if (!existing || item.timestamp > existing.timestamp) {
        latestRunsMap.set(item.name, item);
      }
    });

    const uniqueItems = Array.from(latestRunsMap.values());
    
    // --- Calculate Stats based on UNIQUE (Latest) items ---
    const totalAnalyzed = uniqueItems.length; // Count unique components
    const totalRuns = staticItems.length; // Total history volume
    
    let totalScore = 0;
    
    const categoryCounts: Record<string, number> = {
      'ДОСТУПНОСТЬ': 0,
      'ПРОИЗВОДИТЕЛЬНОСТЬ': 0,
      'ЛОГИКА': 0,
      'СТИЛЬ': 0,
      'ЛУЧШИЕ ПРАКТИКИ': 0
    };

    uniqueItems.forEach(item => {
      totalScore += item.score || 0;
      
      if (item.categories) {
        Object.entries(item.categories).forEach(([cat, count]) => {
           const translatedCat = 
             cat === 'ACCESSIBILITY' ? 'ДОСТУПНОСТЬ' :
             cat === 'PERFORMANCE' ? 'ПРОИЗВОДИТЕЛЬНОСТЬ' :
             cat === 'LOGIC' ? 'ЛОГИКА' :
             'ЛУЧШИЕ ПРАКТИКИ';
           
           if (categoryCounts[translatedCat] !== undefined) {
             categoryCounts[translatedCat] += (count as number);
           }
        });
      }
    });

    const avgScore = uniqueItems.length > 0 ? Math.round(totalScore / uniqueItems.length) : 0;

    // --- Prepare Chart Data ---

    // Bar Chart: Shows HISTORY (Process). We want to see the progress, so we use staticItems (sliced)
    const chartData = staticItems.slice(0, 10).map(item => ({
        name: item.name,
        issues: item.issuesCount || 0,
        passed: item.score || 0,
        // Add a marker to show if this was the latest run for this component
        isLatest: latestRunsMap.get(item.name)?.id === item.id
    })).reverse(); // Re-reverse so oldest is left, newest is right (better for timeline)

    // Pie Chart: Shows CURRENT STATE. Uses uniqueItems.
    const typeData = Object.entries(categoryCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    return {
      totalAnalyzed,
      totalRuns,
      avgScore,
      chartData,
      typeData
    };

  }, [history]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-4 animate-fade-in">
        <div className="bg-slate-800 p-6 rounded-full">
          <svg className="w-12 h-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Нет данных для отображения</h2>
        <p className="text-slate-400 max-w-md">
          Запустите статический анализ кода или визуальный тест, чтобы увидеть статистику и графики в этом разделе.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Уникальных компонентов</h3>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-3xl font-bold text-white">{stats.totalAnalyzed}</p>
            <span className="text-slate-500 text-sm mb-1">({stats.totalRuns} запусков)</span>
          </div>
          <p className="text-emerald-400 text-xs mt-1">Активная сессия</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Ср. оценка (Актуальная)</h3>
          <p className="text-3xl font-bold text-white mt-2">{stats.avgScore}</p>
          <p className={`${stats.avgScore > 80 ? 'text-emerald-400' : stats.avgScore > 50 ? 'text-yellow-400' : 'text-rose-400'} text-xs mt-1`}>
            {stats.avgScore > 80 ? 'Высокое качество' : 'Требуется улучшение'}
          </p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Последняя проверка</h3>
          <p className="text-lg font-bold text-white mt-2 truncate">
            {history[0]?.name || '-'}
          </p>
          <p className="text-slate-400 text-xs mt-1">
             {new Date(history[0]?.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-6">История проверок (Последние 10)</h3>
          {stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 0, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="passed" name="Оценка (0-100)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="issues" name="Кол-во проблем" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
               Нет данных статического анализа
            </div>
          )}
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-6">Текущее распределение проблем</h3>
          {stats.typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
           ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
               Проблем не обнаружено (в последних версиях)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;