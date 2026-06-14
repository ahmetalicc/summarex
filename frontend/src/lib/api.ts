import { apiClient } from './apiClient';
import { API_PATHS } from './apiPaths';
import type { Meeting, MeetingUpdate, ProcessingMode } from '../types/meeting';
import type { Transcript } from '../types/transcript';
import type { Summary } from '../types/summary';
import type {
  CreateShareResponse,
  MeetingStatusResponse,
  PublicMeetingView,
} from '../types/share';

export interface ListMeetingsParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export function listMeetings(params: ListMeetingsParams = {}): Promise<Meeting[]> {
  return apiClient.get<Meeting[]>(API_PATHS.meetings, {
    query: { limit: params.limit, offset: params.offset, search: params.search },
  });
}

export function getMeeting(id: string): Promise<Meeting> {
  return apiClient.get<Meeting>(API_PATHS.meeting(id));
}

export function getTranscript(id: string): Promise<Transcript> {
  return apiClient.get<Transcript>(API_PATHS.meetingTranscript(id));
}

export function getSummary(id: string): Promise<Summary> {
  return apiClient.get<Summary>(API_PATHS.meetingSummary(id));
}

export function getMeetingStatus(id: string): Promise<MeetingStatusResponse> {
  return apiClient.get<MeetingStatusResponse>(API_PATHS.meetingStatus(id));
}

export function updateMeeting(id: string, patch: MeetingUpdate): Promise<Meeting> {
  return apiClient.patch<Meeting>(API_PATHS.meeting(id), patch);
}

export function deleteMeeting(id: string): Promise<Meeting> {
  return apiClient.delete<Meeting>(API_PATHS.meeting(id));
}

export interface UploadAudioOptions {
  title?: string;
  mode?: ProcessingMode;
  durationSeconds?: number;
}

function buildAudioForm(file: Blob, filename: string, opts: UploadAudioOptions): FormData {
  const form = new FormData();
  form.append('file', file, filename);
  if (opts.title) form.append('title', opts.title);
  if (opts.mode) form.append('mode', opts.mode);
  if (opts.durationSeconds != null) form.append('duration_seconds', String(opts.durationSeconds));
  return form;
}

export function uploadAudio(file: File, opts: UploadAudioOptions = {}): Promise<Meeting> {
  return apiClient.postForm<Meeting>(
    API_PATHS.meetingUpload,
    buildAudioForm(file, file.name, opts),
  );
}

export function recordAudio(blob: Blob, opts: UploadAudioOptions = {}): Promise<Meeting> {
  const filename =
    blob instanceof File ? blob.name : `recording-${Date.now()}.webm`;
  return apiClient.postForm<Meeting>(
    API_PATHS.meetingRecord,
    buildAudioForm(blob, filename, opts),
  );
}

export function regenerateSummary(id: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(API_PATHS.meetingRegenerate(id));
}

export function createShare(id: string): Promise<CreateShareResponse> {
  return apiClient.post<CreateShareResponse>(API_PATHS.meetingShare(id));
}

export function deleteShare(id: string): Promise<null> {
  return apiClient.delete<null>(API_PATHS.meetingShare(id));
}

export function getSharedMeeting(token: string): Promise<PublicMeetingView> {
  return apiClient.get<PublicMeetingView>(API_PATHS.sharedAccess(token), {
    auth: 'optional',
  });
}

export function health(): Promise<{ status: string }> {
  return apiClient.get<{ status: string }>(API_PATHS.health, { auth: 'optional' });
}
