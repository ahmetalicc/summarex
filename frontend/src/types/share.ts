export interface SharedLink {
  id: string;
  meeting_id: string;
  token: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}
