-- Add rental fields to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS rental_duration INTEGER,
ADD COLUMN IF NOT EXISTS rental_time_unit VARCHAR(10) DEFAULT 'day',
ADD COLUMN IF NOT EXISTS was_returned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_date TIMESTAMP WITH TIME ZONE;

-- Add rental fields to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS rental_time_unit VARCHAR(10) DEFAULT 'day',
ADD COLUMN IF NOT EXISTS rental_duration INTEGER DEFAULT 1;

-- Update existing rental products
UPDATE products 
SET product_type = 'rental' 
WHERE product_type IS NULL AND rental_duration IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_order_items_rental ON order_items(rental_duration, was_returned);
CREATE INDEX IF NOT EXISTS idx_order_items_product_order ON order_items(product_id, order_id);
