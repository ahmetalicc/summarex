import { useQuery } from '@tanstack/react-query';
import { getSharedMeeting } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import type { PublicMeetingView } from '../types/share';

export function usePublicSharedMeeting(token: string | undefined) {
  return useQuery<PublicMeetingView>({
    queryKey: queryKeys.shared.byToken(token ?? ''),
    queryFn: () => getSharedMeeting(token as string),
    enabled: !!token,
    retry: (failureCount, error) => {
      const status = (error as { status?: number } | undefined)?.status;
      if (status === 404) return false;
      return failureCount < 1;
    },
  });
}
