import React, { useState, useEffect } from 'react';
import { 
  BarChart4, 
  Clock, 
  Layers, 
  FileText,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { api } from '../services/api';
import { AnalyticsSummary } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await api.getAnalytics();
        setAnalytics(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to fetch analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171'];

  if (loading) {
    return (
      <div className="flex-1 bg-slate-950 p-8 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm mt-4 font-medium">Computing analytics statistics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex-1 bg-slate-950 p-8 flex items-center justify-center">
        <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Analytics Unavailable</h3>
          <p className="text-xs text-slate-400 mt-1.5">{error || 'No meetings exist to process analytics.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8 space-y-8 h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <BarChart4 className="w-6 h-6 text-sky-400" />
          Analytics Dashboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">Visualize meeting durations, transcription statistics, and resource logs.</p>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Meetings Transcribed</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">{analytics.meetings_count}</h3>
          </div>
          <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Average Meeting Duration</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">
              {analytics.meetings_count > 0 
                ? `${((analytics.duration_total / analytics.meetings_count) / 60).toFixed(1)} min`
                : '0.0 min'}
            </h3>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-semibold">Total Vocabulary (Words)</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">{analytics.words_total}</h3>
          </div>
          <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Timeline Chart */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white tracking-tight border-b border-slate-800 pb-3">
            Meeting Duration Trends
          </h3>
          <div className="h-64 w-full">
            {analytics.timeline.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeline}>
                  <defs>
                    <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} fontStyle="mono" />
                  <YAxis stroke="#64748b" fontSize={10} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: 11 }} />
                  <Area type="monotone" dataKey="duration" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorDuration)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Word count/Speaking volume per meeting */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white tracking-tight border-b border-slate-800 pb-3">
            Word Density per Meeting
          </h3>
          <div className="h-64 w-full">
            {analytics.timeline.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} label={{ value: 'Words', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: 11 }} />
                  <Bar dataKey="words" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Model distribution Pie */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white tracking-tight border-b border-slate-800 pb-3">
            Whisper Model Utilization
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            {analytics.model_distribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.model_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.model_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Keyword Frequency Histogram */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white tracking-tight border-b border-slate-800 pb-3">
            Top Keyword Frequency
          </h3>
          <div className="h-64 w-full">
            {analytics.keywords.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-semibold">No keywords extracted yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.keywords} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis dataKey="text" type="category" stroke="#64748b" fontSize={10} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', fontSize: 11 }} />
                  <Bar dataKey="value" fill="#34d399" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
