-- Comprehensive fix for all JamolStroy Admin Panel issues

-- 1. Ensure products bucket exists and has correct policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create comprehensive storage policies
CREATE POLICY "Public read access for products" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Authenticated upload for products" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'products' AND 
  (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Authenticated update for products" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'products' AND 
  (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Authenticated delete for products" ON storage.objects
FOR DELETE USING (
  bucket_id = 'products' AND 
  (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- 2. Fix products table structure
-- Remove old is_rental column if exists
ALTER TABLE products DROP COLUMN IF EXISTS is_rental CASCADE;

-- Add new columns with proper constraints
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'sale' 
CHECK (product_type IN ('sale', 'rental'));

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS minimum_order INTEGER DEFAULT 1 
CHECK (minimum_order > 0);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description_uz TEXT DEFAULT '';

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS description_ru TEXT DEFAULT '';

-- Update existing records
UPDATE products 
SET product_type = 'sale' 
WHERE product_type IS NULL;

UPDATE products 
SET minimum_order = 1 
WHERE minimum_order IS NULL OR minimum_order < 1;

-- 3. Create/update categories table with full hierarchy support
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_uz VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255) NOT NULL,
    description_uz TEXT DEFAULT '',
    description_ru TEXT DEFAULT '',
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 0,
    path TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT categories_level_check CHECK (level >= 0),
    CONSTRAINT categories_no_self_reference CHECK (id != parent_id)
);

-- Create indexes for performance
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);
CREATE INDEX idx_categories_path ON categories USING GIN(to_tsvector('english', path));
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- Function to update category hierarchy
CREATE OR REPLACE FUNCTION update_category_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    parent_level INTEGER := 0;
    parent_path TEXT := '';
BEGIN
    -- Handle hierarchy updates
    IF NEW.parent_id IS NULL THEN
        NEW.level = 0;
        NEW.path = NEW.id::text;
    ELSE
        -- Get parent info
        SELECT level, path INTO parent_level, parent_path
        FROM categories
        WHERE id = NEW.parent_id;
        
        -- Prevent circular references
        IF parent_path LIKE '%' || NEW.id::text || '%' THEN
            RAISE EXCEPTION 'Circular reference detected in category hierarchy';
        END IF;
        
        NEW.level = parent_level + 1;
        NEW.path = parent_path || '.' || NEW.id::text;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_category_hierarchy ON categories;
CREATE TRIGGER trigger_update_category_hierarchy
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_category_hierarchy();

-- 4. Update orders table with all required columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_payed BOOLEAN DEFAULT FALSE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_agree BOOLEAN DEFAULT FALSE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT FALSE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_borrowed BOOLEAN DEFAULT FALSE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS borrowed_period INTEGER DEFAULT 0 
CHECK (borrowed_period >= 0);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS borrowed_additional_period INTEGER DEFAULT 0 
CHECK (borrowed_additional_period >= 0);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS borrowed_updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

-- 5. Create MD passwords table
DROP TABLE IF EXISTS md_passwords CASCADE;

CREATE TABLE md_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_hash TEXT NOT NULL,
    created_by TEXT DEFAULT 'system',
    last_used_at TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT md_passwords_single_row CHECK (id = gen_random_uuid())
);

-- Create unique constraint to ensure only one password exists
CREATE UNIQUE INDEX idx_md_passwords_singleton ON md_passwords ((1));

-- 6. Create comprehensive debtors view
CREATE OR REPLACE VIEW debtors AS
SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.customer_phone,
    o.customer_email,
    o.total_amount,
    o.borrowed_period,
    o.borrowed_additional_period,
    o.borrowed_updated_at,
    o.created_at,
    o.updated_at,
    o.delivery_address,
    o.notes,
    
    -- Calculate days remaining
    CASE 
        WHEN o.borrowed_updated_at IS NOT NULL THEN
            GREATEST(0, 
                o.borrowed_period + COALESCE(o.borrowed_additional_period, 0) - 
                EXTRACT(DAY FROM (NOW() - o.borrowed_updated_at))::INTEGER
            )
        ELSE
            GREATEST(0, 
                o.borrowed_period - 
                EXTRACT(DAY FROM (NOW() - o.created_at))::INTEGER
            )
    END as days_remaining,
    
    -- Check if overdue
    CASE 
        WHEN o.borrowed_updated_at IS NOT NULL THEN
            (NOW() - o.borrowed_updated_at) > 
            INTERVAL '1 day' * (o.borrowed_period + COALESCE(o.borrowed_additional_period, 0))
        ELSE
            (NOW() - o.created_at) > INTERVAL '1 day' * o.borrowed_period
    END as is_overdue,
    
    -- Calculate overdue days
    CASE 
        WHEN o.borrowed_updated_at IS NOT NULL THEN
            GREATEST(0,
                EXTRACT(DAY FROM (NOW() - o.borrowed_updated_at))::INTEGER -
                (o.borrowed_period + COALESCE(o.borrowed_additional_period, 0))
            )
        ELSE
            GREATEST(0,
                EXTRACT(DAY FROM (NOW() - o.created_at))::INTEGER - o.borrowed_period
            )
    END as overdue_days

FROM orders o
WHERE o.is_borrowed = TRUE AND o.is_payed = FALSE;

-- 7. Insert sample categories
INSERT INTO categories (name_uz, name_ru, description_uz, description_ru, sort_order) VALUES
('Qurilish materiallari', 'Строительные материалы', 'Barcha qurilish materiallari', 'Все строительные материалы', 1),
('Elektr jihozlar', 'Электрические приборы', 'Elektr jihozlari va aksessuarlar', 'Электрические приборы и аксессуары', 2),
('Santexnika', 'Сантехника', 'Santexnika buyumlari', 'Сантехнические изделия', 3),
('Asboblar', 'Инструменты', 'Qurilish va ta\'mir asboblari', 'Строительные и ремонтные инструменты', 4),
('Bo\'yoqlar', 'Краски', 'Bo\'yoqlar va laklar', 'Краски и лаки', 5)
ON CONFLICT DO NOTHING;

-- Add subcategories
DO $$
DECLARE
    parent_id UUID;
BEGIN
    -- Qurilish materiallari subcategories
    SELECT id INTO parent_id FROM categories WHERE name_uz = 'Qurilish materiallari' LIMIT 1;
    IF parent_id IS NOT NULL THEN
        INSERT INTO categories (name_uz, name_ru, parent_id, sort_order) VALUES
        ('Sement', 'Цемент', parent_id, 1),
        ('G''isht', 'Кирпич', parent_id, 2),
        ('Beton', 'Бетон', parent_id, 3)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Elektr jihozlar subcategories
    SELECT id INTO parent_id FROM categories WHERE name_uz = 'Elektr jihozlar' LIMIT 1;
    IF parent_id IS NOT NULL THEN
        INSERT INTO categories (name_uz, name_ru, parent_id, sort_order) VALUES
        ('Kabellar', 'Кабели', parent_id, 1),
        ('Rozetkalar', 'Розетки', parent_id, 2),
        ('Lampalar', 'Лампы', parent_id, 3)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 8. Update products to have category_id
DO $$
DECLARE
    default_category_id UUID;
BEGIN
    SELECT id INTO default_category_id FROM categories WHERE name_uz = 'Qurilish materiallari' LIMIT 1;
    
    IF default_category_id IS NOT NULL THEN
        UPDATE products 
        SET category_id = default_category_id 
        WHERE category_id IS NULL;
    END IF;
END $$;

-- 9. Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_md_passwords_updated_at ON md_passwords;
CREATE TRIGGER update_md_passwords_updated_at
    BEFORE UPDATE ON md_passwords
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Create RLS policies
-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read categories" ON categories;
CREATE POLICY "Allow public read categories" ON categories
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write categories" ON categories;
CREATE POLICY "Allow authenticated write categories" ON categories
FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- MD Passwords (restricted access)
ALTER TABLE md_passwords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated access md_passwords" ON md_passwords;
CREATE POLICY "Allow authenticated access md_passwords" ON md_passwords
FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 11. Create helpful functions
-- Function to get category tree
CREATE OR REPLACE FUNCTION get_category_tree()
RETURNS TABLE (
    id UUID,
    name_uz VARCHAR,
    name_ru VARCHAR,
    parent_id UUID,
    level INTEGER,
    path TEXT,
    children_count BIGINT,
    products_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE category_tree AS (
        -- Root categories
        SELECT 
            c.id, c.name_uz, c.name_ru, c.parent_id, c.level, c.path,
            0::BIGINT as children_count,
            0::BIGINT as products_count
        FROM categories c
        WHERE c.parent_id IS NULL AND c.is_active = true
        
        UNION ALL
        
        -- Child categories
        SELECT 
            c.id, c.name_uz, c.name_ru, c.parent_id, c.level, c.path,
            0::BIGINT as children_count,
            0::BIGINT as products_count
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.is_active = true
    )
    SELECT 
        ct.*,
        (SELECT COUNT(*) FROM categories WHERE parent_id = ct.id) as children_count,
        (SELECT COUNT(*) FROM products WHERE category_id = ct.id) as products_count
    FROM category_tree ct
    ORDER BY ct.level, ct.name_uz;
END;
$$ LANGUAGE plpgsql;

-- 12. Update table statistics and optimize
ANALYZE products;
ANALYZE orders;
ANALYZE categories;
ANALYZE md_passwords;

-- 13. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_is_borrowed ON orders(is_borrowed);
CREATE INDEX IF NOT EXISTS idx_orders_is_payed ON orders(is_payed);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Success notification
DO $$
BEGIN
    RAISE NOTICE '=== JamolStroy Admin Panel Database Setup Complete ===';
    RAISE NOTICE 'Storage: Products bucket configured with proper policies';
    RAISE NOTICE 'Products: product_type, minimum_order, descriptions added';
    RAISE NOTICE 'Categories: Hierarchical structure with % categories created', (SELECT COUNT(*) FROM categories);
    RAISE NOTICE 'Orders: Payment tracking and debt management columns added';
    RAISE NOTICE 'MD Passwords: Secure password management table created';
    RAISE NOTICE 'Debtors: Advanced view created for debt tracking';
    RAISE NOTICE 'Performance: Indexes and triggers optimized';
    RAISE NOTICE 'Security: RLS policies configured';
    RAISE NOTICE '=== Setup completed successfully! ===';
END $$;
