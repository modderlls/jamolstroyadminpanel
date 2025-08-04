-- Drop existing table if exists
DROP TABLE IF EXISTS public.website_login_sessions;

-- Create website_login_sessions table
CREATE TABLE public.website_login_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    temp_token TEXT NOT NULL,
    client_id TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    telegram_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_website_login_sessions_temp_token ON public.website_login_sessions(temp_token);
CREATE INDEX idx_website_login_sessions_client_id ON public.website_login_sessions(client_id);
CREATE INDEX idx_website_login_sessions_user_id ON public.website_login_sessions(user_id);
CREATE INDEX idx_website_login_sessions_status ON public.website_login_sessions(status);
CREATE INDEX idx_website_login_sessions_expires_at ON public.website_login_sessions(expires_at);

-- Create unique constraint for temp_token and client_id combination
CREATE UNIQUE INDEX unique_temp_token_client_id ON public.website_login_sessions(temp_token, client_id);

-- Create partial unique index for active approved sessions per user (to prevent duplicates)
CREATE UNIQUE INDEX unique_active_approved_session 
ON public.website_login_sessions(user_id) 
WHERE status = 'approved' AND expires_at > NOW();

-- Enable RLS
ALTER TABLE public.website_login_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for service role" ON public.website_login_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow read for authenticated users" ON public.website_login_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_login_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.website_login_sessions 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to cleanup expired sessions (if pg_cron is available)
-- SELECT cron.schedule('cleanup-expired-sessions', '*/30 * * * *', 'SELECT cleanup_expired_login_sessions();');

-- Grant permissions
GRANT ALL ON public.website_login_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.website_login_sessions TO authenticated;
