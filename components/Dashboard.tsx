import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const data = [
  { name: 'Login', issues: 4, passed: 85 },
  { name: 'Navbar', issues: 2, passed: 95 },
  { name: 'Footer', issues: 0, passed: 100 },
  { name: 'Profile', issues: 6, passed: 70 },
  { name: 'Settings', issues: 3, passed: 88 },
];

const typeData = [
  { name: 'Accessibility', value: 35 },
  { name: 'Performance', value: 25 },
  { name: 'Logic', value: 20 },
  { name: 'Style', value: 20 },
];

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981'];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Total Components Analyzed</h3>
          <p className="text-3xl font-bold text-white mt-2">142</p>
          <p className="text-emerald-400 text-xs mt-1">+12% from last week</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Average Quality Score</h3>
          <p className="text-3xl font-bold text-white mt-2">87.5</p>
          <p className="text-emerald-400 text-xs mt-1">Top tier performance</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium">Critical Issues Found</h3>
          <p className="text-3xl font-bold text-white mt-2">3</p>
          <p className="text-rose-400 text-xs mt-1">Needs immediate attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-6">Component Health Status</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="passed" name="Health Score" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="issues" name="Issues Found" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-6">Issue Distribution by Type</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
