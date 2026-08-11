-- 1. Create Depots Table (Stores multi-tenant depot configuration as JSONB)
CREATE TABLE IF NOT EXISTS depots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Audits Table (Replaces local snapshot files with Postgres JSONB)
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    depot_id UUID NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
    period_label TEXT NOT NULL,
    audit_title TEXT NOT NULL,
    storage_path TEXT,
    payload JSONB NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (depot_id, period_label)
);

-- 3. Row Level Security Policies
ALTER TABLE depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Allow full access for service_role and public reads
CREATE POLICY "Allow full access on depots" ON depots
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access on audits" ON audits
    FOR ALL USING (true) WITH CHECK (true);
