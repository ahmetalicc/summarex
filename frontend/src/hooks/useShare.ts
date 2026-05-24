import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createShare, deleteShare } from '../lib/api';
import type { CreateShareResponse } from '../types/share';

function shareKey(meetingId: string) {
  return ['meeting', meetingId, 'share'] as const;
}

export function useCreateShare(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation<CreateShareResponse, Error, void>({
    mutationFn: () => createShare(meetingId),
    onSuccess: (data) => {
      queryClient.setQueryData(shareKey(meetingId), data);
    },
  });
}

export function useDeleteShare(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation<null, Error, void>({
    mutationFn: () => deleteShare(meetingId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: shareKey(meetingId) });
    },
  });
}

export function useExistingShare(meetingId: string) {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<CreateShareResponse>(shareKey(meetingId));
}
