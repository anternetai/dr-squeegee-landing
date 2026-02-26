-- Dr. Squeegee Job Portal — Migration
-- Run this in the Supabase dashboard: SQL Editor → New Query → Paste → Run

create table if not exists squeegee_jobs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  client_name     text not null,
  client_phone    text,
  client_email    text,
  address         text not null,
  service_type    text not null,
  notes           text,
  price           numeric(10, 2),
  status          text not null default 'new'
                    check (status in ('new', 'quoted', 'approved', 'scheduled', 'complete')),
  appointment_date date,
  appointment_time time
);

-- Enable RLS (but allow all access since no auth needed for now)
alter table squeegee_jobs enable row level security;

-- Allow full access to anon key (no auth required)
create policy "allow_all_squeegee_jobs"
  on squeegee_jobs
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Helpful index for status filtering
create index if not exists idx_squeegee_jobs_status on squeegee_jobs(status);
create index if not exists idx_squeegee_jobs_created_at on squeegee_jobs(created_at desc);
