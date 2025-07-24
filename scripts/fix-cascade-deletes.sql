-- Fix foreign key constraints to allow cascade deletes
-- This will prevent the 23503 error when deleting products that are referenced in order_items

-- First, drop the existing foreign key constraint
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE order_items 
ADD CONSTRAINT order_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES products(id) 
ON DELETE CASCADE;

-- Also fix other potential cascade issues
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE order_items 
ADD CONSTRAINT order_items_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES orders(id) 
ON DELETE CASCADE;

-- Fix categories cascade
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE products 
ADD CONSTRAINT products_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES categories(id) 
ON DELETE SET NULL;

-- Fix customers cascade
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE orders 
ADD CONSTRAINT orders_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE CASCADE;

-- Add was_qarzdor column to orders table for tracking previous debtors
ALTER TABLE orders ADD COLUMN IF NOT EXISTS was_qarzdor BOOLEAN DEFAULT FALSE;

-- Update existing records that were previously debtors
UPDATE orders 
SET was_qarzdor = TRUE 
WHERE is_borrowed = TRUE AND is_payed = TRUE;

-- Add rental-specific columns if they don't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'sale';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rental_start_date TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rental_end_date TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rental_duration INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rental_price_per_day DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_deposit_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_returned BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_date TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS condition_on_return TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS late_return_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS damage_fee DECIMAL(10,2) DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_product_type ON orders(product_type);
CREATE INDEX IF NOT EXISTS idx_orders_rental_dates ON orders(rental_start_date, rental_end_date);
CREATE INDEX IF NOT EXISTS idx_orders_is_returned ON orders(is_returned);
CREATE INDEX IF NOT EXISTS idx_orders_was_qarzdor ON orders(was_qarzdor);

-- Create trigger to automatically set was_qarzdor when debt is paid
CREATE OR REPLACE FUNCTION update_was_qarzdor()
RETURNS TRIGGER AS $$
BEGIN
    -- If order was borrowed and is now paid, mark as was_qarzdor
    IF OLD.is_borrowed = TRUE AND OLD.is_payed = FALSE AND NEW.is_payed = TRUE THEN
        NEW.was_qarzdor = TRUE;
    END IF;
    
    -- Set rental end date if not set and duration is provided
    IF NEW.product_type = 'rental' AND NEW.rental_end_date IS NULL AND NEW.rental_duration IS NOT NULL THEN
        NEW.rental_end_date = COALESCE(NEW.rental_start_date, NEW.created_at) + (NEW.rental_duration || ' days')::INTERVAL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_was_qarzdor ON orders;
CREATE TRIGGER trigger_update_was_qarzdor
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_was_qarzdor();

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON orders;
CREATE POLICY "Enable all operations for authenticated users" ON orders
    FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON categories TO authenticated;
GRANT ALL ON customers TO authenticated;

-- Refresh materialized views if any exist
-- (Add any materialized view refreshes here if needed)

COMMIT;
