export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface TranscriptSegment {
  id: number;
  meeting_id: string;
  start: string;
  end: string;
  start_seconds: number;
  end_seconds: number;
  text: string;
  words?: WordTimestamp[];
}

export interface Memo {
  meeting_id: string;
  summary: string;
  action_items: string[];
  decisions: string[];
  key_points: string[];
  generated_at: string;
  confidence: number;
}

export interface QAEntry {
  id?: number;
  meeting_id: string;
  question: string;
  answer: string;
  timestamp: string;
}

export interface Meeting {
  meeting_id: string;
  title: string;
  date: string;
  duration: number;
  audio_path?: string;
  metadata?: Record<string, any>;
  transcript?: TranscriptSegment[];
  memo?: Memo;
  qa_history?: QAEntry[];
}

export interface SystemSettings {
  model_size: string;
  default_language: string;
  vad_enabled: boolean;
  ollama_url?: string;
  db_path?: string;
}

export interface AnalyticsSummary {
  meetings_count: number;
  duration_total: number;
  words_total: number;
  action_items_total: number;
  timeline: { date: string; duration: number; words: number }[];
  keywords: { text: string; value: number }[];
  model_distribution: { name: string; value: number }[];
}
