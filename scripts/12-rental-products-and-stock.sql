-- Add product type and rental fields to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'sale' CHECK (product_type IN ('sale', 'rental')),
ADD COLUMN IF NOT EXISTS rental_time_unit VARCHAR(20) CHECK (rental_time_unit IN ('hour', 'day', 'week', 'month')),
ADD COLUMN IF NOT EXISTS rental_price_per_unit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rental_deposit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rental_min_duration INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS rental_max_duration INTEGER;

-- Create rental orders table
CREATE TABLE IF NOT EXISTS rental_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  rental_duration INTEGER NOT NULL,
  rental_time_unit VARCHAR(20) NOT NULL,
  rental_start_time TIMESTAMP WITH TIME ZONE,
  rental_end_time TIMESTAMP WITH TIME ZONE,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  rental_price DECIMAL(10,2) NOT NULL,
  delivery_address TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'returned', 'completed')),
  is_confirmed BOOLEAN DEFAULT false,
  is_returned BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  returned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rental_orders_customer_id ON rental_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_product_id ON rental_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON rental_orders(status);

-- Enable RLS
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own rental orders" ON rental_orders
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can insert their own rental orders" ON rental_orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Update users table to store address
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create real reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, customer_id, order_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_customer_id ON product_reviews(customer_id);

-- Enable RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view reviews" ON product_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON product_reviews
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Insert some sample rental products
INSERT INTO products (
  name_uz, name_ru, description_uz, description_ru, 
  category_id, price, unit, product_type, rental_time_unit, 
  rental_price_per_unit, rental_deposit, rental_min_duration, rental_max_duration,
  stock_quantity, min_order_quantity, is_available, is_featured
) VALUES 
-- Rental construction equipment
(
  'Perforator ijarasi', 'Аренда перфоратора', 
  'Professional perforator soatlik ijara uchun', 'Профессиональный перфоратор для почасовой аренды',
  (SELECT id FROM categories WHERE name_uz = 'Asboblar' LIMIT 1),
  0, 'dona', 'rental', 'hour',
  15000, 50000, 1, 24,
  5, 1, true, true
),
(
  'Beton aralashtiruvchi ijarasi', 'Аренда бетономешалки',
  'Beton aralashtiruvchi kunlik ijara', 'Бетономешалка суточная аренда', 
  (SELECT id FROM categories WHERE name_uz = 'Asboblar' LIMIT 1),
  0, 'dona', 'rental', 'day',
  25000, 100000, 1, 30,
  3, 1, true, false
),
(
  'Avtokran ijarasi', 'Аренда автокрана',
  'Avtokran kunlik ijara uchun', 'Автокран для суточной аренды',
  (SELECT id FROM categories WHERE name_uz = 'Asboblar' LIMIT 1), 
  0, 'dona', 'rental', 'day',
  500000, 1000000, 1, 7,
  2, 1, true, true
) ON CONFLICT DO NOTHING;
