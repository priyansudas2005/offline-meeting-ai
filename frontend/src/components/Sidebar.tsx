import React from 'react';
import { 
  LayoutDashboard, 
  Mic, 
  FileText, 
  Sparkles, 
  BrainCircuit, 
  BarChart4, 
  History, 
  Settings, 
  ShieldCheck, 
  Play, 
  Pause, 
  Square,
  RefreshCw,
  FolderSync,
  Volume2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Meeting } from '../types';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  currentMeeting: Meeting | null;
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;

  // Recording State & Methods
  recordingState: 'idle' | 'recording' | 'paused' | 'stopped';
  duration: number;
  recordingError: string | null;
  uploading: boolean;
  title: string;
  setTitle: (t: string) => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  discardRecording: () => void;
  saveRecording: () => void;

  // Model parameters
  modelSize: string;
  setModelSize: (s: string) => void;
  language: string;
  setLanguage: (l: string) => void;
  vadEnabled: boolean;
  setVadEnabled: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  currentMeeting,
  meetings,
  onSelectMeeting,
  
  recordingState,
  duration,
  recordingError,
  uploading,
  title,
  setTitle,
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  discardRecording,
  saveRecording,
  
  modelSize,
  setModelSize,
  language,
  setLanguage,
  vadEnabled,
  setVadEnabled,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recorder', label: 'Recorder', icon: Mic },
    { id: 'history', label: 'Meeting History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart4 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const meetingItems = [
    { id: 'transcript', label: 'Transcript', icon: FileText, disabled: !currentMeeting },
    { id: 'summary', label: 'Meeting Memo', icon: Sparkles, disabled: !currentMeeting },
    { id: 'qa', label: 'AI Assistant', icon: BrainCircuit, disabled: !currentMeeting },
  ];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <aside className="w-80 bg-slate-950/45 backdrop-blur-xl border-r border-slate-900/40 flex flex-col h-screen select-none z-10">
      {/* Brand Section */}
      <div className="p-6 border-b border-slate-900/40 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-xl flex items-center justify-content-center shadow-lg shadow-sky-500/20">
            <Mic className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          {recordingState === 'recording' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-slate-950 rounded-full status-ring-error" />
          )}
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
            SAMVAD
            <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded-full border border-sky-500/30 font-semibold uppercase tracking-wider">
              V2.0
            </span>
          </h1>
          <p className="text-[10.5px] text-slate-400 font-medium font-sans">Offline Meeting Intelligence</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        
        {/* Live Audio Capture Module in Sidebar */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800/60 flex flex-col gap-3 shadow-inner">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audio Capture</h2>
            {recordingState !== 'idle' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                recordingState === 'recording' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {formatTime(duration)}
              </span>
            )}
          </div>

          {/* Recording Controls */}
          {recordingState === 'idle' && (
            <button 
              onClick={startRecording}
              className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/10 hover:scale-[1.01]"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
              Start Recording
            </button>
          )}

          {recordingState === 'recording' && (
            <div className="flex gap-2">
              <button 
                onClick={pauseRecording}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1"
              >
                <Pause className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                Pause
              </button>
              <motion.button 
                onClick={stopRecording}
                animate={{ boxShadow: [
                  "0 0 0 0px rgba(239,68,68,0.4)",
                  "0 0 0 12px rgba(239,68,68,0)",
                ]}}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="flex-1 py-2 bg-rose-500 hover:bg-rose-455 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1 focus:outline-none"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop</span>
                </motion.div>
              </motion.button>
            </div>
          )}

          {recordingState === 'paused' && (
            <div className="flex gap-2">
              <button 
                onClick={resumeRecording}
                className="flex-1 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                Resume
              </button>
              <motion.button 
                onClick={stopRecording}
                animate={{ boxShadow: [
                  "0 0 0 0px rgba(239,68,68,0.4)",
                  "0 0 0 12px rgba(239,68,68,0)",
                ]}}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="flex-1 py-2 bg-rose-500 hover:bg-rose-455 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1 focus:outline-none"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop</span>
                </motion.div>
              </motion.button>
            </div>
          )}

          {recordingState === 'stopped' && (
            <div className="flex flex-col gap-2.5">
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meeting name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400 font-semibold"
              />
              <div className="flex gap-2">
                <button 
                  onClick={discardRecording}
                  disabled={uploading}
                  className="flex-1 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10.5px] font-bold rounded-lg"
                >
                  Discard
                </button>
                <button 
                  onClick={saveRecording}
                  disabled={uploading}
                  className="flex-1 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-[10.5px] font-bold rounded-lg flex items-center justify-center gap-1"
                >
                  {uploading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Glowing Timebar Sweep */}
          {recordingState === 'recording' && (
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-rose-500 rounded-full w-full animate-pulse" style={{ width: `${(duration % 60) * 100 / 60}%` }} />
            </div>
          )}

          {recordingError && (
            <span className="text-[10px] text-rose-500 font-semibold text-center">{recordingError}</span>
          )}
        </div>

        {/* Core Navigation Links */}
        <div>
          <h2 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Workspace</h2>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-400 pl-2.5'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Loaded Meeting Routing */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Analysis</h2>
            {currentMeeting && (
              <span className="text-[9px] font-bold text-slate-400 truncate max-w-[120px]">
                {currentMeeting.title}
              </span>
            )}
          </div>
          <nav className="space-y-1">
            {meetingItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  disabled={item.disabled}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    item.disabled
                      ? 'text-slate-600 cursor-not-allowed opacity-50'
                      : isActive
                      ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-400 pl-2.5'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive && !item.disabled ? 'text-sky-400' : 'text-slate-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Model parameters selectors inside sidebar */}
        <div className="glass-panel p-4 rounded-xl border border-slate-900 space-y-3.5">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI parameters</h2>
          
          <div className="space-y-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Whisper Model</label>
              <select 
                value={modelSize}
                onChange={e => setModelSize(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-400 font-semibold"
              >
                <option value="tiny">Tiny (39M params)</option>
                <option value="base">Base (74M params)</option>
                <option value="small">Small (244M params)</option>
                <option value="medium">Medium (769M params)</option>
                <option value="large-v3">Large V3 (1.5B params)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Language</label>
              <select 
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-400 font-semibold"
              >
                <option value="auto">Auto-Detect</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-900/40 bg-transparent flex flex-col gap-2">
        {currentMeeting && (
          <div className="p-3 bg-slate-950/40 backdrop-blur-md rounded-lg border border-slate-850/40 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-semibold">Loaded Meeting</span>
            <span className="text-xs text-white font-medium truncate">{currentMeeting.title}</span>
            <span className="text-[10px] text-slate-400">
              Duration: {currentMeeting.duration ? `${(currentMeeting.duration / 60).toFixed(1)}m` : '0.0m'}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 px-2 text-[10.5px] text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 status-ring-ready flex-shrink-0" />
          <span>Local Engine Active</span>
        </div>
      </div>
    </aside>
  );
};
