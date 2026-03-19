-- Add features and limits to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 5;

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view or insert admin logs
-- This policy allows anything for gavindycus@gmail.com (though standard RLS uses auth.jwt() so we might just use that or bypass entirely for super admin via service role)
-- Actually, the backend will insert these logs using the service role key, so we don't strictly need insert policies for the web client.
-- But for the sake of completeness, we can allow read access to the super admin.
CREATE POLICY "Admins can view admin_logs"
    ON public.admin_logs FOR SELECT
    USING (auth.jwt() ->> 'email' = 'gavindycus@gmail.com');
