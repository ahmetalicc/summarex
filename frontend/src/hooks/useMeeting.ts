import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMeeting,
  getMeetingStatus,
  getSummary,
  getTranscript,
} from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import type { Meeting, MeetingStatus } from '../types/meeting';
import type { Transcript } from '../types/transcript';
import type { Summary } from '../types/summary';
import type { MeetingStatusResponse } from '../types/share';

const TERMINAL: MeetingStatus[] = ['done', 'transcribed', 'error'];
const ACTIVE: MeetingStatus[] = ['queued', 'transcribing', 'summarizing'];

export function useMeeting(id: string | undefined) {
  return useQuery<Meeting>({
    queryKey: queryKeys.meetings.detail(id ?? ''),
    queryFn: () => getMeeting(id as string),
    enabled: !!id,
  });
}

export function useMeetingStatus(
  id: string | undefined,
  initialStatus?: MeetingStatus,
) {
  const queryClient = useQueryClient();
  const query = useQuery<MeetingStatusResponse>({
    queryKey: queryKeys.meetings.status(id ?? ''),
    queryFn: () => getMeetingStatus(id as string),
    enabled: !!id,
    initialData: initialStatus
      ? { status: initialStatus, error_message: null }
      : undefined,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return 2000;
      return ACTIVE.includes(data.status) ? 2000 : false;
    },
  });

  useEffect(() => {
    if (!id || !query.data) return;
    if (query.data.status === 'done') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.transcript(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.summary(id) });
    } else if (query.data.status === 'transcribed') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.transcript(id) });
    } else if (query.data.status === 'error') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.detail(id) });
    }
  }, [id, query.data, queryClient]);

  return query;
}

export function useTranscript(id: string | undefined, status?: MeetingStatus) {
  return useQuery<Transcript>({
    queryKey: queryKeys.meetings.transcript(id ?? ''),
    queryFn: () => getTranscript(id as string),
    enabled: !!id && !!status && TERMINAL.includes(status),
    retry: (failureCount, error) => {
      const status = (error as { status?: number } | undefined)?.status;
      if (status === 404) return false;
      return failureCount < 1;
    },
  });
}

export function useSummary(id: string | undefined, status?: MeetingStatus) {
  return useQuery<Summary>({
    queryKey: queryKeys.meetings.summary(id ?? ''),
    queryFn: () => getSummary(id as string),
    enabled: !!id && status === 'done',
    retry: (failureCount, error) => {
      const status = (error as { status?: number } | undefined)?.status;
      if (status === 404) return false;
      return failureCount < 1;
    },
  });
}
