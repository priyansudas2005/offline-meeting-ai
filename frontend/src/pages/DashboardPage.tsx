import React, { useRef, useState } from 'react';
import { 
  UploadCloud, 
  Mic, 
  FileAudio, 
  Layers, 
  Clock, 
  FileText, 
  CheckSquare, 
  CalendarDays,
  ArrowRight
} from 'lucide-react';
import { Meeting } from '../types';
import { api } from '../services/api';

interface DashboardPageProps {
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
  setActivePage: (page: string) => void;
  refreshMeetings: () => Promise<void>;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  meetings,
  onSelectMeeting,
  setActivePage,
  refreshMeetings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute stats
  const totalMeetings = meetings.length;
  const totalDurationMin = meetings.reduce((acc, m) => acc + (m.duration || 0), 0) / 60;
  const totalWords = meetings.reduce((acc, m) => {
    const segmentWords = m.transcript?.reduce((sum, seg) => sum + seg.text.split(' ').length, 0) || 0;
    return acc + segmentWords;
  }, 0);
  const actionItemsCount = meetings.reduce((acc, m) => acc + (m.memo?.action_items?.length || 0), 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const title = file.name.replace(/\.[^/.]+$/, ""); // strip extension
      const newMeeting = await api.uploadAudio(file, title);
      await refreshMeetings();
      onSelectMeeting(newMeeting);
      setActivePage('transcript');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to upload audio file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8 space-y-8">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Meeting Intelligence Dashboard</h1>
        <p className="text-slate-400 mt-1">Record, transcribe, and extract insights securely, fully offline.</p>
      </div>

      {/* Grid Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Meetings</span>
            <h3 className="text-3xl font-extrabold text-white mt-1">{totalMeetings}</h3>
          </div>
          <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Duration Processed</span>
            <h3 className="text-3xl font-extrabold text-white mt-1">
              {totalDurationMin < 60 ? `${totalDurationMin.toFixed(1)}m` : `${(totalDurationMin / 60).toFixed(1)}h`}
            </h3>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Words Transcribed</span>
            <h3 className="text-3xl font-extrabold text-white mt-1">
              {totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}
            </h3>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Action Items</span>
            <h3 className="text-3xl font-extrabold text-white mt-1">{actionItemsCount}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Capture & Upload Widget */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div 
            className={`glass-panel p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-200 min-h-[300px] ${
              dragActive ? 'border-sky-400 bg-sky-500/5' : 'border-slate-800 hover:border-slate-700'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="audio/*" 
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                <h4 className="text-lg font-bold text-white">Uploading audio...</h4>
                <p className="text-sm text-slate-400">Storing recording file in local SQLite meeting database.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
                  <UploadCloud className="w-8 h-8 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Upload meeting audio</h4>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">
                    Drag and drop your MP3, WAV, M4A or FLAC file, or select it manually.
                  </p>
                </div>
                {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
                <div className="flex gap-4 mt-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-sky-500/10 flex items-center gap-2"
                  >
                    Browse Files
                  </button>
                  <button 
                    onClick={() => setActivePage('recorder')}
                    className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4 text-emerald-400" />
                    Record Live
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent meetings list */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-sky-400" />
              Recent Meetings
            </h3>
            <button 
              onClick={() => setActivePage('history')}
              className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1"
            >
              See all
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {meetings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 border border-slate-800/30 rounded-xl border-dashed">
                <FileAudio className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">No meetings yet</p>
                <p className="text-xs mt-0.5">Upload audio or start a live recording above.</p>
              </div>
            ) : (
              meetings.slice(0, 4).map((meeting) => (
                <div 
                  key={meeting.meeting_id}
                  onClick={() => {
                    onSelectMeeting(meeting);
                    setActivePage('transcript');
                  }}
                  className="p-3 bg-slate-900/40 border border-slate-800/50 hover:border-slate-700/60 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-150 group"
                >
                  <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-slate-400 shadow-inner group-hover:text-sky-400">
                    <FileAudio className="w-5 h-5 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{meeting.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">
                        {new Date(meeting.date).toLocaleDateString()}
                      </span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span className="text-[10px] text-slate-400">
                        {meeting.duration ? `${(meeting.duration / 60).toFixed(1)}m` : '0m'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
