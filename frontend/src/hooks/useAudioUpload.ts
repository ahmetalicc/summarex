import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { recordAudio, uploadAudio } from '../lib/api';
import type { Meeting, ProcessingMode } from '../types/meeting';

interface UploadVariables {
  file: File;
  title?: string;
  mode?: ProcessingMode;
  durationSeconds?: number;
}

interface RecordVariables {
  blob: Blob;
  title?: string;
  mode?: ProcessingMode;
  durationSeconds?: number;
}

export function useUploadAudio() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<Meeting, Error, UploadVariables>({
    mutationFn: ({ file, title, mode, durationSeconds }) => uploadAudio(file, { title, mode, durationSeconds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] });
      navigate('/dashboard');
    },
  });
}

export function useRecordAudio() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<Meeting, Error, RecordVariables>({
    mutationFn: ({ blob, title, mode, durationSeconds }) => recordAudio(blob, { title, mode, durationSeconds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] });
      navigate('/dashboard');
    },
  });
}
