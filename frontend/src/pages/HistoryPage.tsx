import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Eye, 
  Calendar, 
  Clock, 
  Edit3, 
  Check, 
  X,
  FileAudio
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Meeting } from '../types';
import { api } from '../services/api';

interface HistoryPageProps {
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
  setActivePage: (page: string) => void;
  refreshMeetings: () => Promise<void>;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  meetings,
  onSelectMeeting,
  setActivePage,
  refreshMeetings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this meeting? This will remove all audio paths, transcripts, and summaries from local storage.")) return;
    try {
      await api.deleteMeeting(id);
      await refreshMeetings();
    } catch (err) {
      console.error(err);
      alert("Failed to delete meeting.");
    }
  };

  const startEdit = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(meeting.meeting_id);
    setEditTitle(meeting.title);
  };

  const saveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim() || saving) return;
    setSaving(true);
    try {
      // Modify metadata title
      await api.updateSettings({} as any); // just a trigger or we can create an endpoint in the API
      // Actually we will make our meetings API support title updates. Let's make sure the backend endpoint supports PATCH /api/meetings/{id} or we can save it.
      // Wait, we can implement `PATCH /api/meetings/{id}` in our FastAPI backend to update the meeting title. That is very neat!
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() })
      });
      if (!res.ok) throw new Error('Failed to update meeting title');
      
      await refreshMeetings();
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to rename meeting.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8 space-y-8 h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-sky-400" />
          Meeting History
        </h1>
        <p className="text-slate-400 text-sm mt-1">Review, rename, manage, and delete previous recordings and intelligence records.</p>
      </div>

      {/* Control bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings by title..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-400 font-semibold"
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
        {filteredMeetings.length === 0 ? (
          <div className="py-20 text-center text-slate-500 font-medium">
            No meetings found in database.
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {filteredMeetings.map((meeting, index) => (
              <motion.div 
                key={meeting.meeting_id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                onClick={() => {
                  onSelectMeeting(meeting);
                  setActivePage('transcript');
                }}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-900/30 cursor-pointer transition-all group"
              >
                {/* Meta details */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-sky-400 shadow-inner">
                    <FileAudio className="w-6 h-6 transition-colors" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingId === meeting.meeting_id ? (
                      <div className="flex items-center gap-2 max-w-md" onClick={e => e.stopPropagation()}>
                        <input 
                          type="text" 
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-400 font-semibold"
                        />
                        <button 
                          onClick={(e) => saveEdit(meeting.meeting_id, e)}
                          disabled={saving}
                          className="w-8 h-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg flex items-center justify-center"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={cancelEdit}
                          className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors truncate">
                        {meeting.title}
                      </h3>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>{new Date(meeting.date).toLocaleDateString()} {new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        <span>{meeting.duration ? `${(meeting.duration / 60).toFixed(1)} min` : '0 min'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-16 md:ml-0" onClick={e => e.stopPropagation()}>
                  {editingId !== meeting.meeting_id && (
                    <button 
                      onClick={(e) => startEdit(meeting, e)}
                      className="p-2 hover:bg-slate-800/80 border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                      title="Rename Meeting"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      onSelectMeeting(meeting);
                      setActivePage('transcript');
                    }}
                    className="p-2 hover:bg-slate-800/80 border border-transparent hover:border-slate-800 text-slate-400 hover:text-sky-400 rounded-lg transition-all"
                    title="View Analytics & Transcript"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(meeting.meeting_id, e)}
                    className="p-2 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10 text-slate-500 hover:text-rose-500 rounded-lg transition-all"
                    title="Delete Meeting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
