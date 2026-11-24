-- ==============================================================================
-- The Village of Justice — Supabase Realtime Database Schema
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vzzkyuhbhvchkovvsyag/sql/new
-- ==============================================================================

-- 1. Create Complaints Table
CREATE TABLE IF NOT EXISTS public.complaints (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner TEXT NOT NULL,
    title TEXT NOT NULL,
    narrative TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending_review',
    ai JSONB NOT NULL DEFAULT '{"state":"not_run"}'::jsonb,
    ai_consent INTEGER NOT NULL DEFAULT 0,
    created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_complaints_owner ON public.complaints(owner, created DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status, created DESC);

-- 2. Create Events Table (Audit log & timeline)
CREATE TABLE IF NOT EXISTS public.events (
    id BIGSERIAL PRIMARY KEY,
    complaint TEXT NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_complaint ON public.events(complaint, created ASC);

-- 3. Create Files Table (Evidence attachments)
CREATE TABLE IF NOT EXISTS public.files (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    complaint TEXT NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_complaint ON public.files(complaint);

-- 4. Enable Row Level Security (RLS) with Public Access policies
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to complaints" ON public.complaints;
CREATE POLICY "Allow public read access to complaints" ON public.complaints FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to complaints" ON public.complaints;
CREATE POLICY "Allow public insert to complaints" ON public.complaints FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to complaints" ON public.complaints;
CREATE POLICY "Allow public update to complaints" ON public.complaints FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete to complaints" ON public.complaints;
CREATE POLICY "Allow public delete to complaints" ON public.complaints FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
CREATE POLICY "Allow public read access to events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to events" ON public.events;
CREATE POLICY "Allow public insert to events" ON public.events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to files" ON public.files;
CREATE POLICY "Allow public read access to files" ON public.files FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to files" ON public.files;
CREATE POLICY "Allow public insert to files" ON public.files FOR INSERT WITH CHECK (true);

-- 5. Enable Realtime Publications
-- This activates instant WebSocket push notifications when complaints or events change
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'complaints'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END $$;

-- 6. Insert Initial Demo Complaints for immediate testing
INSERT INTO public.complaints (id, owner, title, narrative, details, status, created, updated)
VALUES 
  (
    'ba523de9-f428-4029-85e2-1259d5161ff7',
    'demo.user',
    'UPI Fraud - Fake Customer Care Call',
    'Received a fraudulent phone call claiming to be customer care and was misled into approving a transaction.',
    '{"incident_type": "UPI Fraud", "amount": "₹15,000"}'::jsonb,
    'pending_review',
    NOW(),
    NOW()
  ),
  (
    'af6f1fc8-0f6a-4cc9-9a8e-dacef8603cb1',
    'demo.user',
    'WhatsApp Phishing & Impersonation',
    'Unknown number impersonating a friend requested an urgent UPI money transfer.',
    '{"incident_type": "Identity Theft", "platform": "WhatsApp"}'::jsonb,
    'in_progress',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

