-- Fix all database issues for JamolStroy Admin Panel

-- 1. Fix storage policies for products bucket
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create proper storage policies
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- 2. Update products table schema
ALTER TABLE products 
DROP COLUMN IF EXISTS is_rental CASCADE;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'sale' CHECK (product_type IN ('sale', 'rental'));

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS minimum_order INTEGER DEFAULT 1;

-- Update existing data
UPDATE products SET product_type = 'sale' WHERE product_type IS NULL;

-- 3. Create/update categories table with hierarchical structure
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_uz VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 0,
    path TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path);

-- Function to update category level and path
CREATE OR REPLACE FUNCTION update_category_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.level = 0;
        NEW.path = NEW.id::text;
    ELSE
        SELECT level + 1, path || '.' || NEW.id::text
        INTO NEW.level, NEW.path
        FROM categories
        WHERE id = NEW.parent_id;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for category hierarchy
DROP TRIGGER IF EXISTS trigger_update_category_hierarchy ON categories;
CREATE TRIGGER trigger_update_category_hierarchy
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_category_hierarchy();

-- 4. Update orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_payed BOOLEAN DEFAULT FALSE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_agree BOOLEAN DEFAULT FALSE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT FALSE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_borrowed BOOLEAN DEFAULT FALSE;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS borrowed_period INTEGER DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS borrowed_additional_period INTEGER DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS borrowed_updated_at TIMESTAMP WITH TIME ZONE;

-- 5. Create MD password table
CREATE TABLE IF NOT EXISTS md_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create debtors view
CREATE OR REPLACE VIEW debtors AS
SELECT 
    o.*,
    CASE 
        WHEN o.borrowed_updated_at IS NOT NULL THEN
            GREATEST(0, o.borrowed_period + COALESCE(o.borrowed_additional_period, 0) - 
                    EXTRACT(DAY FROM (NOW() - o.borrowed_updated_at))::INTEGER)
        ELSE
            GREATEST(0, o.borrowed_period - 
                    EXTRACT(DAY FROM (NOW() - o.created_at))::INTEGER)
    END as days_remaining,
    CASE 
        WHEN o.borrowed_updated_at IS NOT NULL THEN
            (NOW() - o.borrowed_updated_at) > INTERVAL '1 day' * (o.borrowed_period + COALESCE(o.borrowed_additional_period, 0))
        ELSE
            (NOW() - o.created_at) > INTERVAL '1 day' * o.borrowed_period
    END as is_overdue
FROM orders o
WHERE o.is_borrowed = TRUE AND o.is_payed = FALSE;

-- 7. Insert sample categories if none exist
INSERT INTO categories (name_uz, name_ru, parent_id) 
SELECT 'Qurilish materiallari', 'Строительные материалы', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_uz = 'Qurilish materiallari');

INSERT INTO categories (name_uz, name_ru, parent_id) 
SELECT 'Elektr jihozlar', 'Электрические приборы', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_uz = 'Elektr jihozlar');

INSERT INTO categories (name_uz, name_ru, parent_id) 
SELECT 'Santexnika', 'Сантехника', NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name_uz = 'Santexnika');

-- 8. Update products to have category_id if missing
DO $$
DECLARE
    default_category_id UUID;
BEGIN
    -- Get or create default category
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

-- Apply to products table
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply to orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply to categories table
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Create RLS policies for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON categories
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated write access" ON categories
FOR ALL USING (auth.role() = 'authenticated');

-- 11. Refresh materialized views if any exist
-- (Add any materialized view refreshes here if needed)

-- 12. Update table statistics
ANALYZE products;
ANALYZE orders;
ANALYZE categories;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema updated successfully!';
    RAISE NOTICE 'Products table: product_type column added, minimum_order added';
    RAISE NOTICE 'Categories table: hierarchical structure created';
    RAISE NOTICE 'Orders table: payment and debt tracking columns added';
    RAISE NOTICE 'MD passwords table: created for secure access';
    RAISE NOTICE 'Debtors view: created for debt management';
    RAISE NOTICE 'Storage policies: fixed for products bucket';
END $$;
