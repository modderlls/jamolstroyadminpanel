-- Telegram webhook info jadvali
CREATE TABLE IF NOT EXISTS telegram_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    webhook_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Foydalanuvchilar jadvaliga qo'shimcha maydonlar
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_language_code VARCHAR(10) DEFAULT 'uz';
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_photo_url TEXT;

-- Mahsulotlar uchun o'xshash mahsulotlar view
CREATE OR REPLACE VIEW similar_products AS
SELECT 
    p1.id as product_id,
    p2.id as similar_product_id,
    p2.name_uz,
    p2.price,
    p2.unit,
    p2.images,
    p2.is_featured,
    p2.is_popular,
    CASE 
        WHEN p1.category_id = p2.category_id THEN 3
        WHEN p1.price BETWEEN p2.price * 0.8 AND p2.price * 1.2 THEN 2
        ELSE 1
    END as similarity_score
FROM products p1
CROSS JOIN products p2
WHERE p1.id != p2.id 
    AND p2.is_available = true
    AND p1.is_available = true;

-- Mahsulot ko'rishlar statistikasi
CREATE TABLE IF NOT EXISTS product_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savatcha uchun session support
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_unique 
    ON cart_items(user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_session_product_unique 
    ON cart_items(session_id, product_id) WHERE session_id IS NOT NULL;

-- Mahsulot kategoriyalari uchun breadcrumb
CREATE OR REPLACE FUNCTION get_category_breadcrumb(category_id UUID)
RETURNS TEXT AS $$
DECLARE
    breadcrumb TEXT := '';
    current_category RECORD;
BEGIN
    WITH RECURSIVE category_path AS (
        SELECT id, name_uz, parent_id, 0 as level
        FROM categories 
        WHERE id = category_id
        
        UNION ALL
        
        SELECT c.id, c.name_uz, c.parent_id, cp.level + 1
        FROM categories c
        INNER JOIN category_path cp ON c.id = cp.parent_id
    )
    SELECT string_agg(name_uz, ' > ' ORDER BY level DESC) INTO breadcrumb
    FROM category_path;
    
    RETURN COALESCE(breadcrumb, '');
END;
$$ LANGUAGE plpgsql;

-- Mahsulot qidirish uchun full-text search
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.name_uz, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.name_ru, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description_uz, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description_ru, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_search_vector_trigger ON products;
CREATE TRIGGER update_product_search_vector_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Mavjud mahsulotlar uchun search vector yangilash
UPDATE products SET search_vector = 
    setweight(to_tsvector('simple', COALESCE(name_uz, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(name_ru, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(description_uz, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(description_ru, '')), 'B')
WHERE search_vector IS NULL;

-- Indekslar
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_session ON product_views(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);

-- RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Products policies (public read)
CREATE POLICY IF NOT EXISTS "Products are viewable by everyone" ON products
    FOR SELECT USING (is_available = true);

-- Orders policies
CREATE POLICY IF NOT EXISTS "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid()::text = customer_id::text);

CREATE POLICY IF NOT EXISTS "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid()::text = customer_id::text);

-- Cart policies
CREATE POLICY IF NOT EXISTS "Users can manage own cart" ON cart_items
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Webhook ma'lumotlarini saqlash
INSERT INTO telegram_webhooks (webhook_url, webhook_info) 
VALUES (
    COALESCE(current_setting('app.webhook_url', true), 'https://your-app.vercel.app/api/telegram-webhook'),
    '{"status": "active", "allowed_updates": ["message", "callback_query"]}'::jsonb
) ON CONFLICT DO NOTHING;
