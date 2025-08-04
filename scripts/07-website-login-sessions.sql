-- Create website_login_sessions table
CREATE TABLE IF NOT EXISTS website_login_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    login_token VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_website_login_sessions_token ON website_login_sessions(login_token);
CREATE INDEX IF NOT EXISTS idx_website_login_sessions_status ON website_login_sessions(status);
CREATE INDEX IF NOT EXISTS idx_website_login_sessions_expires ON website_login_sessions(expires_at);

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_login_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM website_login_sessions 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically cleanup expired sessions
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_sessions()
RETURNS trigger AS $$
BEGIN
    PERFORM cleanup_expired_login_sessions();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs cleanup on insert
DROP TRIGGER IF EXISTS cleanup_expired_sessions_trigger ON website_login_sessions;
CREATE TRIGGER cleanup_expired_sessions_trigger
    AFTER INSERT ON website_login_sessions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_expired_sessions();

-- Add RLS policies
ALTER TABLE website_login_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for reading own sessions
CREATE POLICY "Users can read their own login sessions" ON website_login_sessions
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Policy for creating sessions (anyone can create)
CREATE POLICY "Anyone can create login sessions" ON website_login_sessions
    FOR INSERT WITH CHECK (true);

-- Policy for updating sessions (only system can update)
CREATE POLICY "System can update login sessions" ON website_login_sessions
    FOR UPDATE USING (true);

-- Grant permissions
GRANT ALL ON website_login_sessions TO authenticated;
GRANT ALL ON website_login_sessions TO anon;
