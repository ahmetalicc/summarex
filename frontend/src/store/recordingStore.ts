import { create } from 'zustand';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

interface RecordingStoreState {
  state: RecordingState;
  durationMs: number;
  blob: Blob | null;
  errorMessage: string | null;

  setState: (state: RecordingState) => void;
  setDurationMs: (ms: number) => void;
  setBlob: (blob: Blob | null) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

const initial = {
  state: 'idle' as RecordingState,
  durationMs: 0,
  blob: null as Blob | null,
  errorMessage: null as string | null,
};

export const useRecordingStore = create<RecordingStoreState>((set) => ({
  ...initial,
  setState: (state) => set({ state }),
  setDurationMs: (durationMs) => set({ durationMs }),
  setBlob: (blob) => set({ blob }),
  setError: (errorMessage) =>
    set({ errorMessage, state: errorMessage ? 'error' : 'idle' }),
  reset: () => set({ ...initial }),
}));
