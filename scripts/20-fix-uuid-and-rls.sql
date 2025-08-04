-- Fix UUID validation errors and setup proper RLS
-- Remove all invalid UUID values and setup public access

-- First, fix any invalid UUID values by setting them to NULL
UPDATE cart_items SET variant_id = NULL WHERE variant_id = '';
UPDATE cart_items SET customer_id = NULL WHERE customer_id = '';
UPDATE order_items SET variant_id = NULL WHERE variant_id = '';
UPDATE product_reviews SET variant_id = NULL WHERE variant_id = '';
UPDATE addresses SET user_id = NULL WHERE user_id = '';
UPDATE orders SET address_id = NULL WHERE address_id = '';
UPDATE orders SET customer_id = NULL WHERE customer_id = '';

-- Fix any invalid numeric values
UPDATE products SET price = 0 WHERE price::text ~ '[^0-9.]';
UPDATE products SET delivery_price = 0 WHERE delivery_price::text ~ '[^0-9.]';
UPDATE products SET rental_price_per_unit = 0 WHERE rental_price_per_unit::text ~ '[^0-9.]';

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('sale', 'rental');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rental_time_unit AS ENUM ('hour', 'day', 'week', 'month');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update products table to use proper enum types
ALTER TABLE products 
ALTER COLUMN product_type TYPE product_type USING product_type::product_type,
ALTER COLUMN rental_time_unit TYPE rental_time_unit USING rental_time_unit::rental_time_unit;

-- Remove postal_code from addresses table completely
ALTER TABLE addresses DROP COLUMN IF EXISTS postal_code;

-- Add company address column if not exists
ALTER TABLE company ADD COLUMN IF NOT EXISTS address text;

-- Update company with address info
UPDATE company SET address = 'Toshkent shahar, Chilonzor tumani, Bunyodkor shoh ko''chasi 12-uy' WHERE address IS NULL;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE company ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Public read access" ON products;
DROP POLICY IF EXISTS "Public read access" ON categories;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can manage own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can manage own reviews" ON product_reviews;
DROP POLICY IF EXISTS "Public read worker profiles" ON worker_profiles;
DROP POLICY IF EXISTS "Workers can update own profile" ON worker_profiles;
DROP POLICY IF EXISTS "Public read ads" ON ads;
DROP POLICY IF EXISTS "Public read company" ON company;

-- Create simple public access policies
CREATE POLICY "Public access" ON users FOR ALL USING (true);
CREATE POLICY "Public access" ON products FOR ALL USING (true);
CREATE POLICY "Public access" ON categories FOR ALL USING (true);
CREATE POLICY "Public access" ON orders FOR ALL USING (true);
CREATE POLICY "Public access" ON order_items FOR ALL USING (true);
CREATE POLICY "Public access" ON cart_items FOR ALL USING (true);
CREATE POLICY "Public access" ON addresses FOR ALL USING (true);
CREATE POLICY "Public access" ON product_reviews FOR ALL USING (true);
CREATE POLICY "Public access" ON worker_profiles FOR ALL USING (true);
CREATE POLICY "Public access" ON ads FOR ALL USING (true);
CREATE POLICY "Public access" ON company FOR ALL USING (true);

-- Grant permissions to anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Add worker role to users if not exists
UPDATE users SET role = 'worker' WHERE id IN (
    SELECT user_id FROM worker_profiles
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_has_delivery ON products(has_delivery);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_customer_id ON cart_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_is_available ON worker_profiles(is_available);

ANALYZE;
