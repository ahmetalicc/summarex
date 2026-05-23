import type { Language, MeetingStatus } from './meeting';
import type { TranscriptSegment } from './transcript';
import type { ActionItem, Sentiment } from './summary';

export interface SharedLink {
  id: string;
  meeting_id: string;
  token: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateShareResponse {
  token: string;
  share_path: string;
}

export interface MeetingStatusResponse {
  status: MeetingStatus;
  error_message: string | null;
}

export interface PublicTranscript {
  full_text: string;
  segments: TranscriptSegment[];
  language: Language | null;
}

export interface PublicSummary {
  overview: string;
  decisions: string[];
  action_items: ActionItem[];
  topics: string[];
  sentiment: Sentiment | null;
  key_quotes: string[];
}

export interface PublicMeetingView {
  title: string | null;
  created_at: string | null;
  duration_seconds: number | null;
  language: Language | null;
  transcript: PublicTranscript | null;
  summary: PublicSummary | null;
}
