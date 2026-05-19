export type Sentiment = 'productive' | 'tense' | 'casual' | 'neutral';

export interface ActionItem {
  task: string;
  assignee: string | null;
  deadline: string | null;
}

export interface Summary {
  id: string;
  meeting_id: string;
  overview: string;
  decisions: string[];
  action_items: ActionItem[];
  topics: string[];
  sentiment: Sentiment | null;
  key_quotes: string[];
  raw_ai_response: Record<string, unknown> | null;
  created_at: string;
}
