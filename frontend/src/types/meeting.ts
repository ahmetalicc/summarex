export type MeetingStatus = 'queued' | 'transcribing' | 'transcribed' | 'summarizing' | 'done' | 'error';
export type ProcessingMode = 'summary' | 'transcript';
export type Language = 'en' | 'tr';

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  audio_url: string | null;
  duration_seconds: number | null;
  language: Language | null;
  status: MeetingStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingCreate {
  title?: string;
}

export interface MeetingUpdate {
  title?: string;
}
