-- Add product type enum
CREATE TYPE product_type AS ENUM ('sale', 'rental');

-- Add rental time unit enum  
CREATE TYPE rental_time_unit AS ENUM ('hour', 'day', 'week', 'month');

-- Update products table to support rental products
ALTER TABLE products 
ADD COLUMN product_type product_type DEFAULT 'sale',
ADD COLUMN rental_time_unit rental_time_unit,
ADD COLUMN rental_price_per_unit DECIMAL(10,2),
ADD COLUMN rental_deposit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN rental_min_duration INTEGER DEFAULT 1,
ADD COLUMN rental_max_duration INTEGER;

-- Update categories table to support unlimited nesting
ALTER TABLE categories 
ADD COLUMN level INTEGER DEFAULT 0,
ADD COLUMN path TEXT;

-- Create function to update category path and level
CREATE OR REPLACE FUNCTION update_category_path_and_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate level and path
  IF NEW.parent_id IS NULL THEN
    NEW.level = 0;
    NEW.path = NEW.id::text;
  ELSE
    SELECT level + 1, path || '.' || NEW.id::text
    INTO NEW.level, NEW.path
    FROM categories 
    WHERE id = NEW.parent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for category path updates
DROP TRIGGER IF EXISTS category_path_trigger ON categories;
CREATE TRIGGER category_path_trigger
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_category_path_and_level();

-- Update existing categories
UPDATE categories SET path = id::text, level = 0 WHERE parent_id IS NULL;

-- Update child categories
WITH RECURSIVE category_tree AS (
  -- Base case: root categories
  SELECT id, parent_id, 0 as level, id::text as path
  FROM categories 
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child categories
  SELECT c.id, c.parent_id, ct.level + 1, ct.path || '.' || c.id::text
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
UPDATE categories 
SET level = ct.level, path = ct.path
FROM category_tree ct
WHERE categories.id = ct.id;

-- Create rental orders table for rental-specific data
CREATE TABLE IF NOT EXISTS rental_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  rental_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  rental_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  rental_duration INTEGER NOT NULL,
  rental_time_unit rental_time_unit NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  return_status VARCHAR(20) DEFAULT 'pending',
  return_date TIMESTAMP WITH TIME ZONE,
  damage_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_rental_time_unit ON products(rental_time_unit);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path);
CREATE INDEX IF NOT EXISTS idx_rental_orders_order_id ON rental_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_dates ON rental_orders(rental_start_date, rental_end_date);

-- Enable RLS
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rental_orders
CREATE POLICY "Users can view their own rental orders" ON rental_orders
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own rental orders" ON rental_orders
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

-- Insert sample rental products
INSERT INTO products (
  name_uz, name_ru, description_uz, description_ru, 
  category_id, price, unit, product_type, rental_time_unit, 
  rental_price_per_unit, rental_deposit, rental_min_duration, rental_max_duration,
  stock_quantity, min_order_quantity, is_available, is_featured
) VALUES 
-- Rental construction equipment
(
  'Perforator ijarasi', 'Аренда перфоратора', 
  'Professional perforator kunlik ijara uchun', 'Профессиональный перфоратор для суточной аренды',
  (SELECT id FROM categories WHERE name_uz = 'Asboblar' LIMIT 1),
  0, 'dona', 'rental', 'day',
  25000, 50000, 1, 30,
  5, 1, true, true
),
(
  'Beton aralashtiruvchi ijarasi', 'Аренда бетономешалки',
  'Beton aralashtiruvchi soatlik ijara', 'Бетономешалка почасовая аренда', 
  (SELECT id FROM categories WHERE name_uz = 'Asboblar' LIMIT 1),
  0, 'dona', 'rental', 'hour',
  15000, 100000, 2, 24,
  3, 1, true, false
),
(
  'Avtokran ijarasi', 'Аренда автокрана',
  'Avtokran kunlik ijara uchun', 'Автокран для суточной аренды',
  (SELECT id FROM categories WHERE name_uz = 'Asboblar' LIMIT 1), 
  0, 'dona', 'rental', 'day',
  500000, 1000000, 1, 7,
  2, 1, true, true
);

-- Add some subcategories for better organization
INSERT INTO categories (name_uz, name_ru, parent_id, icon_name, sort_order, is_active) VALUES
('Elektr asboblari', 'Электроинструменты', (SELECT id FROM categories WHERE name_uz = 'Asboblar' LIMIT 1), 'electrical', 1, true),
('Qo''l asboblari', 'Ручные инструменты', (SELECT id FROM categories WHERE name_uz = 'Asboblar' LIMIT 1), 'tools', 2, true),
('Og''ir texnika', 'Тяжелая техника', (SELECT id FROM categories WHERE name_uz = 'Asboblar' LIMIT 1), 'construction', 3, true);

-- Add sub-subcategories
INSERT INTO categories (name_uz, name_ru, parent_id, icon_name, sort_order, is_active) VALUES
('Perforatorlar', 'Перфораторы', (SELECT id FROM categories WHERE name_uz = 'Elektr asboblari' LIMIT 1), 'electrical', 1, true),
('Bolg''alar', 'Молотки', (SELECT id FROM categories WHERE name_uz = 'Qo''l asboblari' LIMIT 1), 'tools', 1, true),
('Kranlar', 'Краны', (SELECT id FROM categories WHERE name_uz = 'Og''ir texnika' LIMIT 1), 'construction', 1, true);
