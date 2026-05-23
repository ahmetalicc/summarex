export interface MeetingsListParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export const queryKeys = {
  meetings: {
    list: (params: MeetingsListParams) => ['meetings', params] as const,
    detail: (id: string) => ['meeting', id] as const,
    status: (id: string) => ['meeting', id, 'status'] as const,
    transcript: (id: string) => ['meeting', id, 'transcript'] as const,
    summary: (id: string) => ['meeting', id, 'summary'] as const,
  },
  shared: {
    byToken: (token: string) => ['shared', token] as const,
  },
} as const;
