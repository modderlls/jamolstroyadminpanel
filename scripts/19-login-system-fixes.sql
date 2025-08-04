-- Login system fixes and improvements
-- This script fixes login-related issues and improves the authentication system

-- Drop existing website_login_sessions table and recreate with proper structure
DROP TABLE IF EXISTS website_login_sessions CASCADE;

-- Create improved website_login_sessions table
CREATE TABLE website_login_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    temp_token TEXT NOT NULL,
    client_id TEXT NOT NULL DEFAULT 'jamolstroy_web',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
    approved_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

-- Create unique indexes for login sessions
CREATE UNIQUE INDEX idx_website_login_sessions_temp_token ON website_login_sessions(temp_token);
CREATE INDEX idx_website_login_sessions_client_id ON website_login_sessions(client_id);
CREATE INDEX idx_website_login_sessions_user_id ON website_login_sessions(user_id);
CREATE INDEX idx_website_login_sessions_telegram_id ON website_login_sessions(telegram_id);
CREATE INDEX idx_website_login_sessions_status ON website_login_sessions(status);
CREATE INDEX idx_website_login_sessions_expires_at ON website_login_sessions(expires_at);

-- Improve login_sessions table structure
ALTER TABLE login_sessions 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    -- Cleanup expired website login sessions
    DELETE FROM website_login_sessions 
    WHERE expires_at < NOW() OR (status = 'pending' AND created_at < NOW() - INTERVAL '1 hour');
    
    -- Cleanup expired login sessions
    DELETE FROM login_sessions 
    WHERE expires_at < NOW() OR (status = 'pending' AND created_at < NOW() - INTERVAL '1 hour');
    
    -- Update expired sessions to 'expired' status before deletion
    UPDATE website_login_sessions 
    SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < NOW();
    
    UPDATE login_sessions 
    SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to create login session
CREATE OR REPLACE FUNCTION create_login_session(
    p_telegram_id BIGINT,
    p_client_id TEXT DEFAULT 'jamolstroy_web',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(session_token TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_token TEXT;
    v_expires TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate unique token
    LOOP
        v_token := generate_secure_token(64);
        EXIT WHEN NOT EXISTS (SELECT 1 FROM website_login_sessions WHERE temp_token = v_token);
    END LOOP;
    
    v_expires := NOW() + INTERVAL '10 minutes';
    
    -- Cleanup old sessions for this telegram_id
    DELETE FROM website_login_sessions 
    WHERE telegram_id = p_telegram_id AND status = 'pending';
    
    -- Insert new session
    INSERT INTO website_login_sessions (
        temp_token, 
        client_id, 
        telegram_id, 
        expires_at,
        ip_address,
        user_agent
    ) VALUES (
        v_token, 
        p_client_id, 
        p_telegram_id, 
        v_expires,
        p_ip_address,
        p_user_agent
    );
    
    RETURN QUERY SELECT v_token, v_expires;
END;
$$ LANGUAGE plpgsql;

-- Create function to approve login session
CREATE OR REPLACE FUNCTION approve_login_session(
    p_temp_token TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_session_exists BOOLEAN;
BEGIN
    -- Check if session exists and is valid
    SELECT EXISTS(
        SELECT 1 FROM website_login_sessions 
        WHERE temp_token = p_temp_token 
        AND status = 'pending' 
        AND expires_at > NOW()
    ) INTO v_session_exists;
    
    IF NOT v_session_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update session
    UPDATE website_login_sessions 
    SET 
        status = 'approved',
        user_id = p_user_id,
        approved_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'  -- Extend expiry for approved sessions
    WHERE temp_token = p_temp_token;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get session info
CREATE OR REPLACE FUNCTION get_session_info(p_temp_token TEXT)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    telegram_id BIGINT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.telegram_id,
        s.status,
        s.created_at,
        s.expires_at,
        s.approved_at
    FROM website_login_sessions s
    WHERE s.temp_token = p_temp_token;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on login tables
ALTER TABLE website_login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for website_login_sessions
CREATE POLICY "Allow service role full access" ON website_login_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to read own sessions" ON website_login_sessions
    FOR SELECT USING (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Allow anonymous users to create sessions" ON website_login_sessions
    FOR INSERT WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- Create RLS policies for login_sessions
CREATE POLICY "Allow service role full access on login_sessions" ON login_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to read own login sessions" ON login_sessions
    FOR SELECT USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON website_login_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON website_login_sessions TO authenticated;
GRANT SELECT, INSERT ON website_login_sessions TO anon;

GRANT ALL ON login_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON login_sessions TO authenticated;

-- Create scheduled cleanup job (if pg_cron extension is available)
-- This will run every 30 minutes to cleanup expired sessions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('cleanup-expired-sessions', '*/30 * * * *', 'SELECT cleanup_expired_sessions();');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- pg_cron not available, skip scheduling
        NULL;
END $$;

ANALYZE;
