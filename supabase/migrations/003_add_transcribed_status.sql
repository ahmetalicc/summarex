-- Add 'transcribed' status for the standalone transcribe-only flow (audio → transcript, no summary).
--   queued → transcribing → transcribed          (transcribe-only flow)
--   queued → transcribing → summarizing → done   (summarize flow, unchanged)
--   transcribed → summarizing → done             (summarize an existing transcript)
alter table meetings drop constraint if exists meetings_status_check;
alter table meetings add constraint meetings_status_check
  check (status in ('queued','transcribing','transcribed','summarizing','done','error'));
