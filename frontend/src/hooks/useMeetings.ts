import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteMeeting, listMeetings } from '../lib/api';
import { queryKeys, type MeetingsListParams } from '../lib/queryKeys';
import type { Meeting, MeetingStatus } from '../types/meeting';

const ACTIVE_STATUSES: MeetingStatus[] = ['queued', 'transcribing', 'summarizing'];

export function useMeetingsList(params: MeetingsListParams) {
  return useQuery<Meeting[]>({
    queryKey: queryKeys.meetings.list(params),
    queryFn: () => listMeetings(params),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.some((m) => ACTIVE_STATUSES.includes(m.status)) ? 2000 : false;
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation<Meeting, Error, string>({
    mutationFn: (id) => deleteMeeting(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}
