import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Settings, 
  Play, 
  FileAudio,
  Sparkles,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Meeting } from '../types';
import { api } from '../services/api';

interface TranscriptPageProps {
  currentMeeting: Meeting;
  onUpdateMeeting: (meeting: Meeting) => void;
}

export const TranscriptPage: React.FC<TranscriptPageProps> = ({
  currentMeeting,
  onUpdateMeeting,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Processing settings
  const [modelSize, setModelSize] = useState('base');
  const [language, setLanguage] = useState('auto');
  const [vadEnabled, setVadEnabled] = useState(true);

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    try {
      const updated = await api.processMeeting(currentMeeting.meeting_id, {
        modelSize,
        language: language === 'auto' ? undefined : language,
        vadEnabled,
      });
      onUpdateMeeting(updated);
      if (updated.memo && updated.memo.summary.includes("Ollama service unavailable")) {
        setError("Ollama is not running. Summary generation unavailable.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process meeting. Please check model download or RAM capacity.');
    } finally {
      setProcessing(false);
    }
  };

  const getFilteredSegments = () => {
    if (!currentMeeting.transcript) return [];
    if (!searchQuery.trim()) return currentMeeting.transcript;
    const query = searchQuery.toLowerCase();
    return currentMeeting.transcript.filter(seg => 
      seg.text.toLowerCase().includes(query)
    );
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase()
            ? <mark key={i} className="bg-sky-400 text-slate-950 font-semibold px-0.5 rounded">{part}</mark>
            : part
        )}
      </span>
    );
  };

  const hasTranscript = currentMeeting.transcript && currentMeeting.transcript.length > 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8 flex flex-col h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{currentMeeting.title}</h1>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="font-medium">{new Date(currentMeeting.date).toLocaleDateString()}</span>
            <span className="w-1 h-1 bg-slate-800 rounded-full" />
            <span className="font-mono">{currentMeeting.duration ? `${(currentMeeting.duration / 60).toFixed(1)}m` : '0m'}</span>
            {hasTranscript && (
              <>
                <span className="w-1 h-1 bg-slate-800 rounded-full" />
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Processed</span>
              </>
            )}
          </div>
        </div>

        {/* Exports dropdown */}
        {hasTranscript && (
          <div className="flex gap-2">
            <a 
              href={api.getExportUrl(currentMeeting.meeting_id, 'txt')} 
              download 
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              TXT
            </a>
            <a 
              href={api.getExportUrl(currentMeeting.meeting_id, 'csv')} 
              download 
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </a>
            <a 
              href={api.getExportUrl(currentMeeting.meeting_id, 'srt')} 
              download 
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              SRT
            </a>
          </div>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl relative">
        {processing ? (
          /* Processing/Loading Layout */
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
            <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin shadow-lg"></div>
            <h3 className="text-xl font-bold text-white mt-6">Analyzing Audio & Transcribing</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-sm">
              Speech is being processed locally using Faster-Whisper. This may take a minute depending on hardware.
            </p>
            <div className="mt-6 flex gap-6 text-xs text-slate-500 font-mono">
              <div>MODEL: <span className="text-sky-400">{modelSize.toUpperCase()}</span></div>
              <div>LANGUAGE: <span className="text-sky-400">{language.toUpperCase()}</span></div>
              <div>VAD FILTER: <span className="text-sky-400">{vadEnabled ? 'ON' : 'OFF'}</span></div>
            </div>
            {/* Shimmering Skeleton Loader (Fix 1H) */}
            <div className="w-full max-w-md mx-auto space-y-4 animate-pulse mt-8 opacity-45">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="w-10 h-6 bg-slate-800 rounded-md flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-16 h-3 bg-slate-800 rounded-md"></div>
                    <div className="w-full h-3 bg-slate-800 rounded-md"></div>
                    <div className="w-3/4 h-3 bg-slate-800 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !hasTranscript ? (
          /* Process Request Layout */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto w-full space-y-6">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
              <FileAudio className="w-8 h-8 text-sky-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Audio analysis required</h3>
              <p className="text-sm text-slate-400 mt-1">
                This meeting audio has been stored. You need to run local AI transcription and summarization to view the transcript.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Whisper Parameters */}
            <div className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Parameters</span>
                <Settings className="w-4 h-4 text-slate-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Whisper Model</label>
                  <select 
                    value={modelSize} 
                    onChange={(e) => setModelSize(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-400 font-semibold"
                  >
                    <option value="tiny">Tiny (39M params)</option>
                    <option value="base">Base (74M params)</option>
                    <option value="small">Small (244M params)</option>
                    <option value="medium">Medium (769M params)</option>
                    <option value="large-v3">Large V3 (1.5B params)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Language</label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-400 font-semibold"
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
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Voice Activity Detection</span>
                <input 
                  type="checkbox" 
                  checked={vadEnabled}
                  onChange={(e) => setVadEnabled(e.target.checked)}
                  className="w-4 h-4 accent-sky-400 border border-slate-800 rounded focus:ring-0"
                />
              </div>
            </div>

            <button 
              onClick={handleProcess}
              className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
              Analyze & Process Audio
            </button>
          </div>
        ) : (
          /* Active Transcript Viewer Layout */
          <>
            {/* Search filter bar */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/20">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search keywords or sentences..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 font-medium"
                />
              </div>
              {searchQuery && (
                <span className="text-xs text-slate-400 font-semibold bg-slate-850 px-2 py-1 rounded-lg">
                  {getFilteredSegments().length} matches
                </span>
              )}
            </div>

            {/* Scrollable list of segments */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {getFilteredSegments().map((segment, index) => (
                <motion.div 
                  key={segment.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(10, index) * 0.05 }}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  className="flex gap-4 p-4 rounded-xl hover:bg-slate-900/30 border border-transparent hover:border-slate-800/30 group transition-all"
                >
                  {/* Timestamp indicator */}
                  <div className="flex-shrink-0 flex items-start mt-0.5">
                    <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-md text-[10.5px] text-sky-400 font-mono font-semibold">
                      {segment.start}
                    </span>
                  </div>
                  {/* Text panel */}
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-400 mb-1">Speaker {segment.id % 2 === 0 ? 'B' : 'A'}</div>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                      {highlightText(segment.text, searchQuery)}
                    </p>
                  </div>
                </motion.div>
              ))}
              {getFilteredSegments().length === 0 && (
                <div className="py-12 text-center text-slate-500 font-medium">
                  No matching text found.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
