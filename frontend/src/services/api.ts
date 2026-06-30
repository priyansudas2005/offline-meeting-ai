import { Meeting, SystemSettings, AnalyticsSummary, QAEntry } from '../types';

const API_BASE = '/api';

export const api = {
  // Meetings API
  async getMeetings(): Promise<Meeting[]> {
    const res = await fetch(`${API_BASE}/meetings`);
    if (!res.ok) throw new Error('Failed to fetch meetings list');
    return res.json();
  },

  async getMeeting(id: string): Promise<Meeting> {
    const res = await fetch(`${API_BASE}/meetings/${id}`);
    if (!res.ok) throw new Error('Failed to fetch meeting details');
    return res.json();
  },

  async deleteMeeting(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/meetings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete meeting');
  },

  async uploadAudio(file: File, title?: string): Promise<Meeting> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const res = await fetch(`${API_BASE}/meetings/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload audio file');
    return res.json();
  },

  async uploadRecording(audioBlob: Blob, title?: string): Promise<Meeting> {
    const formData = new FormData();
    // Convert blob to file
    const file = new File([audioBlob], `recording_${Date.now()}.wav`, { type: 'audio/wav' });
    formData.append('file', file);
    if (title) formData.append('title', title);

    const res = await fetch(`${API_BASE}/meetings/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload audio recording');
    return res.json();
  },

  async processMeeting(id: string, options?: { modelSize?: string; language?: string; vadEnabled?: boolean }): Promise<Meeting> {
    const res = await fetch(`${API_BASE}/meetings/${id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error('Failed to process meeting');
    return res.json();
  },

  // Q&A API
  async askQuestion(id: string, question: string): Promise<QAEntry> {
    const res = await fetch(`${API_BASE}/meetings/${id}/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error('Failed to get answer');
    return res.json();
  },

  // Settings API
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },

  // Analytics API
  async getAnalytics(): Promise<AnalyticsSummary> {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Export URIs
  getExportUrl(id: string, format: string): string {
    return `${API_BASE}/meetings/${id}/export/${format}`;
  }
};
