import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { recordAudio, uploadAudio } from '../lib/api';
import type { Meeting } from '../types/meeting';

interface UploadVariables {
  file: File;
  title?: string;
}

interface RecordVariables {
  blob: Blob;
  title?: string;
}

export function useUploadAudio() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation<Meeting, Error, UploadVariables>({
    mutationFn: ({ file, title }) => uploadAudio(file, { title }),
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
    mutationFn: ({ blob, title }) => recordAudio(blob, { title }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] });
      navigate('/dashboard');
    },
  });
}
