import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { recordAudio, uploadAudio } from '../lib/api';
import type { Meeting, ProcessingMode } from '../types/meeting';

interface UploadVariables {
  file: File;
  title?: string;
  mode?: ProcessingMode;
}

interface RecordVariables {
  blob: Blob;
  title?: string;
  mode?: ProcessingMode;
}

export function useUploadAudio() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<Meeting, Error, UploadVariables>({
    mutationFn: ({ file, title, mode }) => uploadAudio(file, { title, mode }),
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
    mutationFn: ({ blob, title, mode }) => recordAudio(blob, { title, mode }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] });
      navigate('/dashboard');
    },
  });
}
