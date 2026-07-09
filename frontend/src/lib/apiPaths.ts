export const API_PATHS = {
  health: '/api/v1/health',
  meetings: '/api/v1/meetings',
  meeting: (id: string) => `/api/v1/meetings/${id}`,
  meetingUpload: '/api/v1/meetings/upload',
  meetingRecord: '/api/v1/meetings/record',
  meetingTranscript: (id: string) => `/api/v1/meetings/${id}/transcript`,
  meetingStatus: (id: string) => `/api/v1/meetings/${id}/status`,
  meetingSummary: (id: string) => `/api/v1/meetings/${id}/summary`,
  meetingRegenerate: (id: string) => `/api/v1/meetings/${id}/regenerate-summary`,
  meetingShare: (id: string) => `/api/v1/meetings/${id}/share`,
  sharedAccess: (token: string) => `/api/v1/shared/${token}`,
  deleteAccount: '/api/v1/user/me',
} as const;
