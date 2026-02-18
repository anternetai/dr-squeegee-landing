-- ============================================
-- HomeField Hub — All New Tables Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Call Logs (individual call tracking)
create table if not exists call_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  call_date date default current_date,
  call_time time default localtime,
  business_name text,
  phone_number text,
  contact_made boolean default false,
  conversation boolean default false,
  demo_booked boolean default false,
  demo_held boolean default false,
  deal_closed boolean default false,
  outcome text,
  notes text,
  call_duration_seconds int,
  lead_id text
);

-- 2. Daily Aggregated Stats
create table if not exists daily_call_stats (
  id uuid default gen_random_uuid() primary key,
  call_date date unique not null default current_date,
  total_dials int default 0,
  contacts int default 0,
  conversations int default 0,
  demos_booked int default 0,
  demos_held int default 0,
  deals_closed int default 0,
  hours_dialed numeric(4,2) default 0,
  notes text,
  created_at timestamptz default now()
);

-- 3. Dialer Leads (power dialer queue)
create table if not exists dialer_leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Lead info
  state text,
  business_name text,
  phone_number text unique,
  owner_name text,
  first_name text,
  website text,
  timezone text, -- ET, CT, MT, PT
  
  -- Call tracking
  status text default 'queued',
  attempt_count int default 0,
  max_attempts int default 5,
  last_called_at timestamptz,
  next_call_at timestamptz,
  last_outcome text,
  
  -- Results
  demo_booked boolean default false,
  demo_date timestamptz,
  not_interested boolean default false,
  wrong_number boolean default false,
  
  -- AI transcription
  last_transcript text,
  last_ai_summary text,
  
  -- Notes
  notes text,
  
  -- Source
  import_batch text,
  sheet_row_id text
);

-- 4. Call Recordings / Transcripts
create table if not exists call_transcripts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  lead_id uuid references dialer_leads(id),
  call_log_id uuid references call_logs(id),
  phone_number text,
  duration_seconds int,
  raw_transcript text,
  ai_summary text,
  ai_disposition text,
  ai_notes text
);

-- Indexes
create index if not exists idx_call_logs_call_date on call_logs (call_date desc);
create index if not exists idx_call_logs_outcome on call_logs (outcome);
create index if not exists idx_call_logs_created_at on call_logs (created_at desc);
create index if not exists idx_daily_call_stats_call_date on daily_call_stats (call_date desc);
create index if not exists idx_dialer_leads_status on dialer_leads(status);
create index if not exists idx_dialer_leads_timezone on dialer_leads(timezone);
create index if not exists idx_dialer_leads_next_call on dialer_leads(next_call_at);
create index if not exists idx_dialer_leads_phone on dialer_leads(phone_number);
create index if not exists idx_call_transcripts_lead on call_transcripts(lead_id);

-- RLS (allow all for authenticated — admin only feature)
alter table call_logs enable row level security;
alter table daily_call_stats enable row level security;
alter table dialer_leads enable row level security;
alter table call_transcripts enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_logs' AND policyname = 'allow_all_call_logs') THEN
    create policy "allow_all_call_logs" on call_logs for all using (true) with check (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_call_stats' AND policyname = 'allow_all_daily_stats') THEN
    create policy "allow_all_daily_stats" on daily_call_stats for all using (true) with check (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dialer_leads' AND policyname = 'allow_all_dialer_leads') THEN
    create policy "allow_all_dialer_leads" on dialer_leads for all using (true) with check (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_transcripts' AND policyname = 'allow_all_transcripts') THEN
    create policy "allow_all_transcripts" on call_transcripts for all using (true) with check (true);
  END IF;
END $$;
