-- Enable pgcrypto for gen_random_uuid() (already available in Supabase, but safe to declare)
create extension if not exists "pgcrypto";

-- =============================================================================
-- meetings
-- Central table. One row per uploaded or recorded audio session owned by a user.
-- status tracks the async pipeline: queued → transcribing → summarizing → done | error
-- =============================================================================
create table public.meetings (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  title            text        not null default 'Untitled Meeting',
  audio_url        text,
  duration_seconds integer,
  language         text,                   -- 'en' | 'tr' | null (detected by Whisper)
  status           text        not null default 'queued'
                               check (status in ('queued','transcribing','summarizing','done','error')),
  error_message    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- =============================================================================
-- transcripts
-- Stores the full Whisper output for a meeting: plain text + timestamped segments.
-- segments is a JSONB array of { start: float, end: float, text: string }.
-- =============================================================================
create table public.transcripts (
  id          uuid        primary key default gen_random_uuid(),
  meeting_id  uuid        not null references public.meetings(id) on delete cascade,
  full_text   text        not null,
  segments    jsonb       not null default '[]'::jsonb,
  language    text,                   -- detected language code from Whisper
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- summaries
-- Stores the structured Claude API output for a meeting.
-- decisions, action_items, topics, key_quotes are JSONB arrays for flexibility.
-- raw_ai_response keeps the full Claude response for debugging / re-processing.
-- =============================================================================
create table public.summaries (
  id              uuid        primary key default gen_random_uuid(),
  meeting_id      uuid        not null references public.meetings(id) on delete cascade,
  overview        text        not null,
  decisions       jsonb       not null default '[]'::jsonb,
  action_items    jsonb       not null default '[]'::jsonb,
  topics          jsonb       not null default '[]'::jsonb,
  sentiment       text        check (sentiment in ('productive','tense','casual','neutral')),
  key_quotes      jsonb       not null default '[]'::jsonb,
  raw_ai_response jsonb,
  created_at      timestamptz not null default now()
);

-- =============================================================================
-- shared_links
-- Read-only shareable tokens for a meeting. No auth required to read via token.
-- expires_at null means the link never expires until explicitly revoked.
-- =============================================================================
create table public.shared_links (
  id          uuid        primary key default gen_random_uuid(),
  meeting_id  uuid        not null references public.meetings(id) on delete cascade,
  token       text        not null unique,
  expires_at  timestamptz,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- Indexes
-- =============================================================================
create index meetings_user_id_created_at_idx on public.meetings (user_id, created_at desc);
create index transcripts_meeting_id_idx      on public.transcripts (meeting_id);
create index summaries_meeting_id_idx        on public.summaries (meeting_id);
create index shared_links_token_idx          on public.shared_links (token);

-- =============================================================================
-- updated_at trigger (meetings only — other tables are append-only)
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security
-- Backend uses SERVICE_ROLE_KEY (bypasses RLS). These policies are defense-in-depth
-- for any future direct-from-frontend Supabase client usage.
-- =============================================================================
alter table public.meetings     enable row level security;
alter table public.transcripts  enable row level security;
alter table public.summaries    enable row level security;
alter table public.shared_links enable row level security;

-- meetings: owner has full CRUD
create policy meetings_owner_all on public.meetings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- transcripts: accessible only if the caller owns the parent meeting
create policy transcripts_owner_all on public.transcripts
  for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = transcripts.meeting_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = transcripts.meeting_id and m.user_id = auth.uid()
    )
  );

-- summaries: accessible only if the caller owns the parent meeting
create policy summaries_owner_all on public.summaries
  for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = summaries.meeting_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = summaries.meeting_id and m.user_id = auth.uid()
    )
  );

-- shared_links: accessible only if the caller owns the parent meeting
create policy shared_links_owner_all on public.shared_links
  for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = shared_links.meeting_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = shared_links.meeting_id and m.user_id = auth.uid()
    )
  );
