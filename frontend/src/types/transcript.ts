import type { Language } from './meeting';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  full_text: string;
  segments: TranscriptSegment[];
  language: Language | null;
  created_at: string;
}
