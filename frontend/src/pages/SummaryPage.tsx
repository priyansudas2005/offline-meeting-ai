import React, { useState } from 'react';
import { 
  FileText, 
  CheckSquare, 
  Lightbulb, 
  HelpCircle, 
  Download,
  AlertTriangle,
  Bookmark
} from 'lucide-react';
import { Meeting } from '../types';
import { api } from '../services/api';
import { motion } from 'framer-motion';

interface SummaryPageProps {
  currentMeeting: Meeting;
}

export const SummaryPage: React.FC<SummaryPageProps> = ({ currentMeeting }) => {
  const memo = currentMeeting.memo;
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleCheck = (index: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!memo) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-950 p-8 flex items-center justify-center">
        <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Summary Generated</h3>
          <p className="text-xs text-slate-400 mt-1.5">
            Please run the transcript processor on the Transcript page to generate meeting intelligence and action items.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8 space-y-8 h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Meeting Intelligence & Memo</h1>
          <p className="text-slate-400 text-sm mt-1">Structured minutes, task assignments, and strategic conclusions.</p>
        </div>
        <div className="flex gap-2">
          <a 
            href={api.getExportUrl(currentMeeting.meeting_id, 'md')} 
            download
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Markdown
          </a>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Summary & Key Highlights */}
        <div className="lg:col-span-2 space-y-8">
          {/* Executive Summary */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col gap-4"
          >
            <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-4 h-4 text-sky-400" />
              Executive Summary
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              {memo.summary}
            </p>
          </motion.div>

          {/* Key points/Highlights */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col gap-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Lightbulb className="w-4 h-4 text-sky-400" />
              Key Highlights & Discussion Points
            </h3>
            <ul className="space-y-3">
              {memo.key_points.map((point, index) => (
                <motion.li 
                  key={index} 
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -1, transition: { duration: 0.15 } }}
                  className="flex gap-3 text-sm text-slate-300 font-medium hover:text-white transition-colors"
                >
                  <span className="w-5 h-5 bg-sky-500/10 rounded-full flex items-center justify-center text-[10px] text-sky-400 font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{point}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Side: Action items & Decisions */}
        <div className="space-y-8">
          {/* Action Items List */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col gap-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              Assigned Tasks & Action Items
            </h3>
            <div className="space-y-3">
              {memo.action_items.map((item, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  onClick={() => toggleCheck(index)}
                  className={`p-3 border rounded-xl flex gap-3 cursor-pointer select-none transition-all ${
                    checkedItems[index] 
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-400' 
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700/60 text-slate-200'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={!!checkedItems[index]}
                    onChange={() => {}} // toggled by parent div click
                    className="w-4 h-4 accent-emerald-500 border border-slate-800 rounded focus:ring-0 mt-0.5 flex-shrink-0"
                  />
                  <span className={`text-xs font-semibold leading-relaxed ${checkedItems[index] ? 'line-through' : ''}`}>
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Decision log */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col gap-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Bookmark className="w-4 h-4 text-indigo-400" />
              Decisions Logged
            </h3>
            <ul className="space-y-3.5">
              {memo.decisions.map((decision, index) => (
                <motion.li 
                  key={index} 
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -1, transition: { duration: 0.15 } }}
                  className="flex gap-3 text-xs font-semibold text-slate-300 bg-slate-900/20 border border-slate-800/40 p-3 rounded-xl hover:text-white transition-colors"
                >
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0 mt-1.5" />
                  <span>{decision}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};
