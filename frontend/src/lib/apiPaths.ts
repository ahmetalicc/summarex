export const API_PATHS = {
  health: '/api/health',
  meetings: '/api/meetings',
  meeting: (id: string) => `/api/meetings/${id}`,
  meetingUpload: '/api/meetings/upload',
  meetingRecord: '/api/meetings/record',
  meetingTranscript: (id: string) => `/api/meetings/${id}/transcript`,
  meetingStatus: (id: string) => `/api/meetings/${id}/status`,
  meetingSummary: (id: string) => `/api/meetings/${id}/summary`,
  meetingRegenerate: (id: string) => `/api/meetings/${id}/regenerate`,
  meetingShare: (id: string) => `/api/meetings/${id}/share`,
  shareAccess: (token: string) => `/api/share/${token}`,
} as const;
