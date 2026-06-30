import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { RecorderPage } from './pages/RecorderPage';
import { TranscriptPage } from './pages/TranscriptPage';
import { SummaryPage } from './pages/SummaryPage';
import { QAPage } from './pages/QAPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { Meeting } from './types';
import { api } from './services/api';
import { motion, AnimatePresence } from 'framer-motion';

// Initial theme check before first render to prevent flashing (Fix 2C/3)
const initialTheme = localStorage.getItem('samvad-theme') || 'cosmic';
document.documentElement.className = '';
document.documentElement.classList.add(`theme-${initialTheme}`);

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0,  filter: "blur(0px)" },
  exit:    { opacity: 0, y: -16, filter: "blur(4px)" }
};

function App() {
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [appError, setAppError] = useState<string | null>(null);

  // Global Recording States
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Whisper model parameters
  const [modelSize, setModelSize] = useState<string>('base');
  const [language, setLanguage] = useState<string>('auto');
  const [vadEnabled, setVadEnabled] = useState<boolean>(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const fetchMeetingsList = async () => {
    try {
      const data = await api.getMeetings();
      const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMeetings(sorted);
      
      if (currentMeeting) {
        const found = sorted.find(m => m.meeting_id === currentMeeting.meeting_id);
        if (found) setCurrentMeeting(found);
      }
    } catch (err) {
      console.error(err);
      setAppError('Could not sync with local database server.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchMeetingsList();
      
      // Load initial settings
      try {
        const settings = await api.getSettings();
        if (settings) {
          setModelSize(settings.model_size);
          setLanguage(settings.default_language);
          setVadEnabled(settings.vad_enabled);
        }
      } catch (e) {
        console.error("Failed to load initial settings:", e);
      }
      
      setLoading(false);
    };
    initialize();
  }, []);

  // Timer side-effect
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingState]);

  // Global recording controls
  const startRecording = async () => {
    setRecordingError(null);
    audioChunksRef.current = [];
    setDuration(0);

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);

      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setRecordingState('stopped');
      };

      mediaRecorder.start(1000);
      setRecordingState('recording');
      setTitle(`Meeting recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      
      // Route immediately to Recorder visualizer page
      setActivePage('recorder');
    } catch (err: any) {
      console.error(err);
      setRecordingError('Microphone access denied. Enable permissions.');
      setRecordingState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      mediaRecorderRef.current.stop();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const discardRecording = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setRecordingState('idle');
    setDuration(0);
    setTitle('');
    setRecordingError(null);
    audioChunksRef.current = [];
  };

  const saveRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      setRecordingError('No audio recorded.');
      return;
    }
    setUploading(true);
    setRecordingError(null);

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });

    try {
      const finalTitle = title.trim() || 'Recorded Meeting';
      const meeting = await api.uploadRecording(audioBlob, finalTitle);
      
      // Fetch full meeting list again
      await fetchMeetingsList();
      setCurrentMeeting(meeting);
      
      // Reset recording state
      setStream(null);
      setRecordingState('idle');
      setDuration(0);
      setTitle('');
      
      // Auto route to transcript page
      setActivePage('transcript');
    } catch (err: any) {
      console.error(err);
      setRecordingError(err.message || 'Failed to save audio recording.');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectMeeting = async (meeting: Meeting) => {
    try {
      setLoading(true);
      const details = await api.getMeeting(meeting.meeting_id);
      setCurrentMeeting(details);
    } catch (err) {
      console.error(err);
      setCurrentMeeting(meeting);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCurrentMeeting = (updated: Meeting) => {
    setCurrentMeeting(updated);
    setMeetings(prev => prev.map(m => m.meeting_id === updated.meeting_id ? updated : m));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020617] text-slate-100 relative z-10">
      {/* Background ambient glow circles */}
      <div className="fixed -top-40 -left-40 w-[450px] h-[450px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 -right-40 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-1/2 left-1/3 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <Sidebar 
        activePage={activePage}
        setActivePage={setActivePage}
        currentMeeting={currentMeeting}
        meetings={meetings}
        onSelectMeeting={handleSelectMeeting}
        
        // Recording states
        recordingState={recordingState}
        duration={duration}
        recordingError={recordingError}
        uploading={uploading}
        title={title}
        setTitle={setTitle}
        startRecording={startRecording}
        pauseRecording={pauseRecording}
        resumeRecording={resumeRecording}
        stopRecording={stopRecording}
        discardRecording={discardRecording}
        saveRecording={saveRecording}
        
        // Model parameters
        modelSize={modelSize}
        setModelSize={setModelSize}
        language={language}
        setLanguage={setLanguage}
        vadEnabled={vadEnabled}
        setVadEnabled={setVadEnabled}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-[99] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {appError && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-500 text-xs font-semibold px-6 py-3 flex items-center justify-between">
            <span>⚠️ {appError}</span>
            <button 
              onClick={() => { setAppError(null); fetchMeetingsList(); }}
              className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Page Routing Switch (Fix 1A) */}
        <AnimatePresence mode="wait">
          {activePage === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              <DashboardPage 
                meetings={meetings}
                onSelectMeeting={handleSelectMeeting}
                setActivePage={setActivePage}
                refreshMeetings={fetchMeetingsList}
              />
            </motion.div>
          )}

          {activePage === 'recorder' && (
            <motion.div
              key="recorder"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              <RecorderPage 
                stream={stream}
                recordingState={recordingState}
                duration={duration}
                title={title}
                setTitle={setTitle}
                recordingError={recordingError}
                uploading={uploading}
                startRecording={startRecording}
                pauseRecording={pauseRecording}
                resumeRecording={resumeRecording}
                stopRecording={stopRecording}
                discardRecording={discardRecording}
                saveRecording={saveRecording}
              />
            </motion.div>
          )}

          {activePage === 'history' && (
            <motion.div
              key="history"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              <HistoryPage 
                meetings={meetings}
                onSelectMeeting={handleSelectMeeting}
                setActivePage={setActivePage}
                refreshMeetings={fetchMeetingsList}
              />
            </motion.div>
          )}

          {activePage === 'transcript' && currentMeeting && (
            <motion.div
              key={`transcript-${currentMeeting.meeting_id}`}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              <TranscriptPage 
                currentMeeting={currentMeeting}
                onUpdateMeeting={handleUpdateCurrentMeeting}
              />
            </motion.div>
          )}

          {activePage === 'summary' && currentMeeting && (
            <motion.div
              key={`summary-${currentMeeting.meeting_id}`}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              <SummaryPage 
                currentMeeting={currentMeeting}
              />
            </motion.div>
          )}

          {activePage === 'qa' && currentMeeting && (
            <motion.div
              key={`qa-${currentMeeting.meeting_id}`}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              <QAPage 
                currentMeeting={currentMeeting}
                onUpdateMeeting={handleUpdateCurrentMeeting}
              />
            </motion.div>
          )}

          {activePage === 'analytics' && (
            <motion.div
              key="analytics"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              <AnalyticsPage />
            </motion.div>
          )}

          {activePage === 'settings' && (
            <motion.div
              key="settings"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              <SettingsPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
