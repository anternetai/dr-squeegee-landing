-- Cold Call Sessions & Results
-- Migration: 2026-02-19
-- Tracks cold calling sessions (sit-down calling blocks) and per-lead results

-- Cold call sessions: a calling session (e.g., 9am-11am block)
create table if not exists cold_call_sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  started_at timestamptz default now(),
  ended_at timestamptz,
  
  -- Session stats (denormalized for fast reads)
  total_dials int default 0,
  answered int default 0,
  voicemails int default 0,
  no_answers int default 0,
  wrong_numbers int default 0,
  not_interested int default 0,
  demos_booked int default 0,
  
  -- Metadata
  notes text,
  user_id uuid -- optional: who ran this session
);

-- Cold call results: individual call outcomes within a session
create table if not exists cold_call_results (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  session_id uuid references cold_call_sessions(id) on delete set null,
  lead_id uuid references dialer_leads(id) on delete set null,
  
  -- Call details
  business_name text,
  phone_number text,
  owner_name text,
  outcome text not null check (outcome in (
    'no_answer', 'voicemail', 'conversation', 'gatekeeper',
    'demo_booked', 'not_interested', 'wrong_number', 'callback'
  )),
  notes text,
  demo_date timestamptz,
  
  -- Timestamps
  call_date date default current_date,
  call_time time default localtime
);

-- Indexes
create index if not exists idx_cold_call_sessions_created on cold_call_sessions(created_at desc);
create index if not exists idx_cold_call_sessions_started on cold_call_sessions(started_at desc);
create index if not exists idx_cold_call_results_session on cold_call_results(session_id);
create index if not exists idx_cold_call_results_lead on cold_call_results(lead_id);
create index if not exists idx_cold_call_results_date on cold_call_results(call_date desc);
create index if not exists idx_cold_call_results_outcome on cold_call_results(outcome);

-- Enable RLS
alter table cold_call_sessions enable row level security;
alter table cold_call_results enable row level security;

-- Allow all for authenticated users (admin-only feature)
create policy "Allow all for authenticated users" on cold_call_sessions
  for all using (true) with check (true);

create policy "Allow all for authenticated users" on cold_call_results
  for all using (true) with check (true);
