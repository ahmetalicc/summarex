import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { deleteMeeting, regenerateSummary, updateMeeting } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import type { Meeting, MeetingUpdate } from '../types/meeting';

export function useUpdateMeeting(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Meeting, Error, MeetingUpdate>({
    mutationFn: (patch) => updateMeeting(id, patch),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.meetings.detail(id), next);
      void queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useDeleteMeetingById() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<Meeting, Error, string>({
    mutationFn: (id) => deleteMeeting(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] });
      navigate('/dashboard');
    },
  });
}

export function useRegenerateSummary(id: string) {
  const queryClient = useQueryClient();
  return useMutation<{ status: string }, Error, void>({
    mutationFn: () => regenerateSummary(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.meetings.summary(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.status(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.detail(id) });
    },
  });
}
