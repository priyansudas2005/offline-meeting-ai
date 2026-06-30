import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Mic, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface RecorderPageProps {
  stream: MediaStream | null;
  recordingState: 'idle' | 'recording' | 'paused' | 'stopped';
  duration: number;
  title: string;
  setTitle: (t: string) => void;
  recordingError: string | null;
  uploading: boolean;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  discardRecording: () => void;
  saveRecording: () => void;
}

export const RecorderPage: React.FC<RecorderPageProps> = ({
  stream,
  recordingState,
  duration,
  title,
  setTitle,
  recordingError,
  uploading,
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  discardRecording,
  saveRecording,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 16-bars visualizer frequency factors state (Fix 1B)
  const [barValues, setBarValues] = useState<number[]>(new Array(16).fill(0.125));

  // Hook to start visualizer when stream changes or starts
  useEffect(() => {
    if (stream && recordingState === 'recording') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64; // smaller bin size for 16 distinct bands

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        const nextBars = [];
        const step = Math.floor(bufferLength / 16) || 1;
        for (let i = 0; i < 16; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += dataArray[i * step + j] || 0;
          }
          const avg = sum / step;
          // Map 0-255 to scaleY factor (min 0.125 for 4px height, max 6.0)
          const scaled = 0.125 + (avg / 255) * 5.875;
          nextBars.push(scaled);
        }
        setBarValues(nextBars);
      };

      draw();

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        audioContext.close();
        setBarValues(new Array(16).fill(0.125));
      };
    } else {
      setBarValues(new Array(16).fill(0.125));
    }
  }, [stream, recordingState]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [
      h > 0 ? String(h).padStart(2, '0') : null,
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8 flex flex-col justify-center max-w-4xl mx-auto w-full">
      <div className="glass-panel p-8 md:p-12 rounded-3xl flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/10 via-slate-900/0 to-slate-950/0 pointer-events-none" />

        <div className="mb-6 flex flex-col items-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
            recordingState === 'recording'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 glow-record'
              : recordingState === 'paused'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            <Mic className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-extrabold text-white mt-4 tracking-tight">
            {recordingState === 'idle' && 'Start a New Recording'}
            {recordingState === 'recording' && 'Recording Audio Active'}
            {recordingState === 'paused' && 'Recording Paused'}
            {recordingState === 'stopped' && 'Recording Complete'}
          </h2>
          
          <p className="text-slate-400 text-sm mt-1 max-w-sm leading-relaxed">
            {recordingState === 'idle' && 'Control recording from the sidebar or click the button below. Processing runs 100% locally.'}
            {recordingState === 'recording' && 'Your microphone is active. Waveform shows live volume frequency levels.'}
            {recordingState === 'paused' && 'Recording is paused. Time and duration counters are preserved.'}
            {recordingState === 'stopped' && 'Save the audio to SQLite and begin transcription.'}
          </p>
        </div>

        {/* Audio Visualizer (16 bars) (Fix 1B) */}
        <div className="w-full max-w-md bg-[#020617]/50 rounded-2xl border border-slate-900 px-6 py-8 my-4 shadow-inner flex items-end justify-center gap-2 h-28">
          {barValues.map((val, idx) => (
            <motion.div
              key={idx}
              animate={{ scaleY: val }}
              transition={recordingState === 'recording'
                ? { type: "spring", stiffness: 300, damping: 20 }
                : { duration: 0.3, ease: "easeInOut" }
              }
              style={{ originY: 1 }}
              className={`w-3 h-10 bg-gradient-to-t from-sky-400 to-indigo-500 rounded-full flex-shrink-0 ${
                recordingState === 'recording' ? 'shadow-[0_0_8px_rgba(56,189,248,0.6)]' : ''
              }`}
            />
          ))}
        </div>

        {/* Time duration indicator */}
        {recordingState !== 'idle' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/80 rounded-full border border-slate-850 text-slate-300 font-mono text-lg font-bold my-4">
            <Clock className={`w-4 h-4 ${recordingState === 'recording' ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
            {formatTime(duration)}
          </div>
        )}

        {/* Controls widgets */}
        <div className="flex flex-col items-center gap-6 w-full mt-4">
          <div className="flex justify-center gap-4">
            {recordingState === 'idle' && (
              <button 
                onClick={startRecording}
                className="w-16 h-16 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-full flex items-center justify-center shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
              >
                <Play className="w-6 h-6 fill-slate-950 text-slate-950" />
              </button>
            )}

            {recordingState === 'recording' && (
              <>
                <button 
                  onClick={pauseRecording}
                  className="w-14 h-14 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-full flex items-center justify-center shadow-lg shadow-amber-500/10 transition-all"
                >
                  <Pause className="w-5 h-5 fill-slate-950 text-slate-950" />
                </button>
                <motion.button 
                  onClick={stopRecording}
                  animate={{ boxShadow: [
                    "0 0 0 0px rgba(239,68,68,0.4)",
                    "0 0 0 12px rgba(239,68,68,0)",
                  ]}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-14 h-14 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/10 transition-all focus:outline-none"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Square className="w-5 h-5 fill-white" />
                  </motion.div>
                </motion.button>
              </>
            )}

            {recordingState === 'paused' && (
              <>
                <button 
                  onClick={resumeRecording}
                  className="w-14 h-14 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-full flex items-center justify-center shadow-lg shadow-sky-500/10 transition-all"
                >
                  <Play className="w-5 h-5 fill-slate-950 text-slate-950" />
                </button>
                <motion.button 
                  onClick={stopRecording}
                  animate={{ boxShadow: [
                    "0 0 0 0px rgba(239,68,68,0.4)",
                    "0 0 0 12px rgba(239,68,68,0)",
                  ]}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-14 h-14 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/10 transition-all focus:outline-none"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Square className="w-5 h-5 fill-white" />
                  </motion.div>
                </motion.button>
              </>
            )}
          </div>

          {/* Stopped Form Details */}
          {recordingState === 'stopped' && (
            <div className="w-full max-w-md bg-slate-900/30 p-6 rounded-2xl border border-slate-900 space-y-4">
              <div className="text-left">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Meeting Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter meeting name..."
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-400 font-semibold"
                />
              </div>

              {recordingError && (
                <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold justify-center">
                  <AlertCircle className="w-4 h-4" />
                  <span>{recordingError}</span>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={discardRecording}
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 font-bold rounded-xl text-sm transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={saveRecording}
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save & Transcribe</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
