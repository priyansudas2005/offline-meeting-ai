import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Sliders, 
  Cpu, 
  Check, 
  AlertCircle,
  HelpCircle,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { SystemSettings } from '../types';

const themes = [
  { id: 'cosmic', name: 'COSMIC SLATE', bg: '#020617', accent: '#38bdf8', className: 'theme-cosmic' },
  { id: 'purple', name: 'MIDNIGHT PURPLE', bg: '#0d0a1a', accent: '#a78bfa', className: 'theme-purple' },
  { id: 'emerald', name: 'EMERALD DARK', bg: '#021a0e', accent: '#34d399', className: 'theme-emerald' },
  { id: 'rose', name: 'ROSE NOIR', bg: '#1a0a0a', accent: '#fb7185', className: 'theme-rose' },
  { id: 'amber', name: 'AMBER FORGE', bg: '#1a1000', accent: '#fbbf24', className: 'theme-amber' },
  { id: 'arctic', name: 'ARCTIC WHITE', bg: '#f8fafc', accent: '#0284c7', className: 'theme-arctic' },
  { id: 'tokyo', name: 'NEON TOKYO', bg: '#000000', accent: '#f0abfc', className: 'theme-tokyo' },
  { id: 'steel', name: 'STEEL CARBON', bg: '#111318', accent: '#94a3b8', className: 'theme-steel' },
];

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    model_size: 'base',
    default_language: 'auto',
    vad_enabled: true,
    ollama_url: 'http://localhost:11434',
    db_path: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Appearance states
  const [activeTheme, setActiveTheme] = useState<string>('cosmic');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Read saved theme
    const savedTheme = localStorage.getItem('samvad-theme') || 'cosmic';
    setActiveTheme(savedTheme);

    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch system settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update system settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (themeId: string, themeName: string) => {
    setActiveTheme(themeId);
    // Apply classes to document element
    document.documentElement.className = '';
    document.documentElement.classList.add(`theme-${themeId}`);
    localStorage.setItem('samvad-theme', themeId);
    
    // Trigger toast notification
    setToastMessage(`Theme applied: ${themeName}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-950 p-8 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm mt-4 font-medium">Loading config settings...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8 space-y-8 max-w-3xl mx-auto w-full h-screen relative">
      {/* Toast Notification Container (Fix 1G) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-6 right-6 z-[999] glass-panel px-4 py-3 rounded-2xl border border-slate-800 shadow-2xl flex items-center gap-2 border-l-4 border-l-[var(--accent-primary)]"
          >
            <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-xs font-bold text-white font-sans">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-400" />
          System Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure offline speech engines, local LLM endpoints, and storage path mappings.</p>
      </div>

      {/* Appearance Section (Fix 2A) */}
      <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Palette className="w-4 h-4 text-sky-400" />
          Appearance (Color Schemes)
        </h3>
        <p className="text-slate-400 text-xs mt-1 leading-normal">
          Select a custom color theme mapping. Variables apply dynamically across all dashboards.
        </p>

        {/* 2B Swatches Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {themes.map((theme) => {
            const isActive = activeTheme === theme.id;
            return (
              <motion.div
                key={theme.id}
                onClick={() => handleThemeChange(theme.id, theme.name)}
                whileHover={{ scale: 1.05 }}
                className={`p-4 rounded-xl border cursor-pointer select-none flex items-center gap-4 transition-all duration-300 ${
                  isActive 
                    ? 'bg-slate-900/60'
                    : 'bg-slate-950/40 border-slate-900 hover:border-slate-800'
                }`}
                style={{
                  borderColor: isActive ? theme.accent : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: isActive ? `0 0 15px ${theme.accent}3d` : 'none'
                }}
              >
                {/* Preview Circle */}
                <div 
                  className="w-10 h-10 rounded-full border border-slate-700/40 flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: theme.bg }}
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  />
                </div>

                {/* Theme Meta */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-mono text-xs font-bold text-white truncate tracking-wider">{theme.name}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5 tracking-wide">
                    {theme.id === 'arctic' ? 'Light' : 'Dark'} Mode
                  </p>
                </div>

                {/* Active check icon */}
                {isActive && (
                  <Check className="w-4 h-4" style={{ color: theme.accent }} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Transcription params card */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-sky-400" />
            Speech Recognition (Faster-Whisper)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Default Model Size</label>
              <select 
                value={settings.model_size}
                onChange={e => setSettings({ ...settings, model_size: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-400 font-semibold"
              >
                <option value="tiny">Tiny (39M params)</option>
                <option value="base">Base (74M params)</option>
                <option value="small">Small (244M params)</option>
                <option value="medium">Medium (769M params)</option>
                <option value="large-v3">Large V3 (1.5B params)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1.5 block leading-normal">
                Larger models yield higher word precision but require more RAM/VRAM and run slower.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Default Transcription Language</label>
              <select 
                value={settings.default_language}
                onChange={e => setSettings({ ...settings, default_language: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-400 font-semibold"
              >
                <option value="auto">Auto-Detect Language</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs font-semibold text-slate-200">Voice Activity Detection (VAD) Filter</span>
              <p className="text-[10px] text-slate-500 mt-0.5 max-w-md leading-normal">
                Uses Silero VAD to detect segments containing active voice, trimming silence and reducing hallucinations.
              </p>
            </div>
            <input 
              type="checkbox" 
              checked={settings.vad_enabled}
              onChange={e => setSettings({ ...settings, vad_enabled: e.target.checked })}
              className="w-4 h-4 accent-sky-400 border border-slate-850 rounded"
            />
          </div>
        </div>

        {/* Database parameters card */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Database className="w-4 h-4 text-emerald-400" />
            Storage & Database Configuration
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">SQLite Path Location</label>
            <input 
              type="text" 
              value={settings.db_path || ''}
              onChange={e => setSettings({ ...settings, db_path: e.target.value })}
              placeholder="e.g. data/database/transcripts.db"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-400 font-medium"
            />
            <span className="text-[10px] text-slate-500 mt-1.5 block leading-normal">
              Change the SQLite file destination directory. Leave blank to retain default path logic.
            </span>
          </div>
        </div>

        {/* AI Local LLM parameters card */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Cpu className="w-4 h-4 text-indigo-400" />
            Local LLM Service (Ollama)
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ollama REST Server URL</label>
            <input 
              type="text" 
              value={settings.ollama_url || ''}
              onChange={e => setSettings({ ...settings, ollama_url: e.target.value })}
              placeholder="e.g. http://localhost:11434"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-400 font-medium font-mono"
            />
            <span className="text-[10px] text-slate-500 mt-1.5 block leading-normal">
              Provide your local Ollama connection instance. If running, SAMVAD will direct summary and QA generation tasks to local llama3/mistral models. If not running, it falls back to HuggingFace pipeline packages.
            </span>
          </div>
        </div>

        {/* Action button bar */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {error && (
              <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Check className="w-4 h-4" />
                <span>Settings saved successfully.</span>
              </div>
            )}
          </div>
          
          <button 
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-sky-500/10 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Configurations</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
