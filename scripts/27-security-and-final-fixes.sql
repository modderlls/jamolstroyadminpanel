-- Complete security implementation and final fixes

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can create own order items" ON order_items;
DROP POLICY IF EXISTS "Users can view own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can view reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON product_reviews;
DROP POLICY IF EXISTS "Users can manage own login sessions" ON website_login_sessions;
DROP POLICY IF EXISTS "Anyone can view telegram users" ON telegram_users;
DROP POLICY IF EXISTS "Anyone can manage telegram users" ON telegram_users;
DROP POLICY IF EXISTS "Anyone can view company info" ON company;

-- Secure RLS policies for users table
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role can manage users" ON users FOR ALL USING (auth.role() = 'service_role');

-- Public read access for products and categories
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (is_available = true);
CREATE POLICY "Service role can manage products" ON products FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Service role can manage categories" ON categories FOR ALL USING (auth.role() = 'service_role');

-- Secure orders access
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can create own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Service role can manage orders" ON orders FOR ALL USING (auth.role() = 'service_role');

-- Secure order items access
CREATE POLICY "Users can view own order items" ON order_items 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id 
        AND orders.customer_id = auth.uid()
    )
);
CREATE POLICY "Users can create own order items" ON order_items 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id 
        AND orders.customer_id = auth.uid()
    )
);
CREATE POLICY "Service role can manage order items" ON order_items FOR ALL USING (auth.role() = 'service_role');

-- Secure cart access
CREATE POLICY "Users can view own cart" ON cart_items FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Service role can manage cart" ON cart_items FOR ALL USING (auth.role() = 'service_role');

-- Reviews access
CREATE POLICY "Anyone can view reviews" ON product_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create own reviews" ON product_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update own reviews" ON product_reviews FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Service role can manage reviews" ON product_reviews FOR ALL USING (auth.role() = 'service_role');

-- Login sessions security
CREATE POLICY "Users can view own login sessions" ON website_login_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own login sessions" ON website_login_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage login sessions" ON website_login_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anonymous can create login sessions" ON website_login_sessions FOR INSERT WITH CHECK (true);

-- Telegram users access
CREATE POLICY "Service role can manage telegram users" ON telegram_users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anonymous can view telegram users" ON telegram_users FOR SELECT USING (true);
CREATE POLICY "Anonymous can create telegram users" ON telegram_users FOR INSERT WITH CHECK (true);

-- Company info access
CREATE POLICY "Anyone can view company info" ON company FOR SELECT USING (is_active = true);
CREATE POLICY "Service role can manage company" ON company FOR ALL USING (auth.role() = 'service_role');

-- Fix search function to handle fuzzy matching
CREATE OR REPLACE FUNCTION search_all_content(search_term text, limit_count integer DEFAULT 20)
RETURNS TABLE(
    id uuid,
    title text,
    subtitle text,
    type text,
    image_url text,
    price numeric,
    category text,
    rating numeric,
    has_delivery boolean
) AS $$
BEGIN
    RETURN QUERY
    -- Search products with fuzzy matching
    SELECT 
        p.id,
        p.name_uz as title,
        COALESCE(p.description_uz, '') as subtitle,
        'product'::text as type,
        CASE WHEN p.images IS NOT NULL AND array_length(p.images, 1) > 0 
             THEN p.images[1] 
             ELSE '/placeholder.svg'
        END as image_url,
        p.price,
        COALESCE(c.name_uz, '') as category,
        (4.0 + (random() * 1.0))::numeric as rating,
        p.has_delivery
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_available = true 
    AND p.stock_quantity > 0
    AND (
        search_term = '' OR
        p.name_uz ILIKE '%' || search_term || '%' OR
        p.description_uz ILIKE '%' || search_term || '%' OR
        c.name_uz ILIKE '%' || search_term || '%' OR
        -- Fuzzy matching for similar words
        similarity(p.name_uz, search_term) > 0.3 OR
        similarity(c.name_uz, search_term) > 0.3
    )
    ORDER BY 
        CASE WHEN p.name_uz ILIKE search_term || '%' THEN 1 
             WHEN p.name_uz ILIKE '%' || search_term || '%' THEN 2
             ELSE 3 END,
        p.is_featured DESC,
        p.view_count DESC
    LIMIT limit_count/2

    UNION ALL

    -- Search workers
    SELECT 
        w.id,
        (w.first_name || ' ' || w.last_name) as title,
        w.profession_uz as subtitle,
        'worker'::text as type,
        COALESCE(w.avatar_url, '/placeholder.svg') as image_url,
        w.hourly_rate as price,
        w.profession_uz as category,
        w.rating,
        false as has_delivery
    FROM workers w
    WHERE w.is_available = true
    AND (
        search_term = '' OR
        w.first_name ILIKE '%' || search_term || '%' OR
        w.last_name ILIKE '%' || search_term || '%' OR
        w.profession_uz ILIKE '%' || search_term || '%' OR
        EXISTS (
            SELECT 1 FROM unnest(w.skills) as skill 
            WHERE skill ILIKE '%' || search_term || '%'
        ) OR
        similarity(w.profession_uz, search_term) > 0.3
    )
    ORDER BY w.rating DESC, w.experience_years DESC
    LIMIT limit_count/2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(name_uz gin_trgm_ops, description_uz gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categories_search ON categories USING gin(name_uz gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_workers_search ON workers USING gin(first_name gin_trgm_ops, last_name gin_trgm_ops, profession_uz gin_trgm_ops);

-- Update company info with correct location
UPDATE company SET 
    location = 'Qashqadaryo viloyati, G''uzor tumani',
    employee_count = 100
WHERE is_active = true;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON cart_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON order_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON product_reviews TO authenticated;
GRANT INSERT, UPDATE, DELETE ON addresses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON reviews TO authenticated;
GRANT INSERT, UPDATE, DELETE ON website_login_sessions TO anon, authenticated;
GRANT INSERT, UPDATE ON telegram_users TO anon, authenticated, service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Refresh materialized views if any
ANALYZE;

-- Final security check - ensure all sensitive operations are protected
REVOKE ALL ON users FROM anon;
REVOKE ALL ON orders FROM anon;
REVOKE ALL ON order_items FROM anon;
REVOKE ALL ON cart_items FROM anon;

-- Allow anon to read public data only
GRANT SELECT ON products TO anon;
GRANT SELECT ON categories TO anon;
GRANT SELECT ON company TO anon;
GRANT SELECT ON workers TO anon;
GRANT SELECT ON product_reviews TO anon;
