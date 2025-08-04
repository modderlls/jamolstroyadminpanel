-- Foydalanuvchilar jadvali yangilash
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'worker', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- OAuth clients jadvali (kelajakda foydalanish uchun)
CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    redirect_uris TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login sessions jadvali
CREATE TABLE IF NOT EXISTS login_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    telegram_id BIGINT,
    client_id VARCHAR(255) DEFAULT 'jamolstroy_web',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mahsulotlar jadvaliga maksimal 5 ta rasm cheklash
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_images_check;
ALTER TABLE products ADD CONSTRAINT products_images_check CHECK (array_length(images, 1) <= 5);

-- Buyurtmalar jadvaliga qo'shimcha maydonlar
ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_message_id INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Ishchi profillari jadvaliga qo'shimcha maydonlar
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS description_uz TEXT;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS work_schedule JSONB DEFAULT '{"monday": {"start": "09:00", "end": "18:00"}, "tuesday": {"start": "09:00", "end": "18:00"}, "wednesday": {"start": "09:00", "end": "18:00"}, "thursday": {"start": "09:00", "end": "18:00"}, "friday": {"start": "09:00", "end": "18:00"}, "saturday": {"start": "09:00", "end": "15:00"}, "sunday": {"off": true}}';

-- Default oauth client qo'shish
INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uris) 
VALUES ('jamolstroy_web', 'jamolstroy_web_secret_2024', 'JamolStroy Web', ARRAY['https://your-app.vercel.app/login'])
ON CONFLICT (client_id) DO NOTHING;

-- Indekslar qo'shish
CREATE INDEX IF NOT EXISTS idx_login_sessions_token ON login_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_login_sessions_telegram ON login_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_status ON login_sessions(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Trigger funksiyasi login vaqtini yangilash uchun
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET last_login_at = NOW() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Login sessions uchun trigger
DROP TRIGGER IF EXISTS update_user_last_login ON login_sessions;
CREATE TRIGGER update_user_last_login 
    AFTER UPDATE OF status ON login_sessions 
    FOR EACH ROW 
    WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
    EXECUTE FUNCTION update_last_login();

-- Eski login sessionlarni tozalash funksiyasi
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM login_sessions WHERE expires_at < NOW();
END;
$$ language 'plpgsql';
