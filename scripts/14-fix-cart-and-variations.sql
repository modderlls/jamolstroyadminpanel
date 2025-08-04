-- Fix cart_items table structure
ALTER TABLE public.cart_items 
DROP CONSTRAINT IF EXISTS cart_items_user_id_fkey;

-- Add customer_id column if it doesn't exist
ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS customer_id uuid;

-- Update existing records to use customer_id instead of user_id
UPDATE public.cart_items 
SET customer_id = user_id 
WHERE customer_id IS NULL AND user_id IS NOT NULL;

-- Drop user_id column if it exists
ALTER TABLE public.cart_items 
DROP COLUMN IF EXISTS user_id;

-- Add foreign key constraint for customer_id
ALTER TABLE public.cart_items 
ADD CONSTRAINT cart_items_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

-- Ensure variations column is jsonb
ALTER TABLE public.cart_items 
ALTER COLUMN variations TYPE jsonb USING variations::jsonb;

-- Ensure rental_duration is integer
ALTER TABLE public.cart_items 
ALTER COLUMN rental_duration TYPE integer USING rental_duration::integer;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cart_items_customer_id ON public.cart_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

-- Fix order_items table for variations
ALTER TABLE public.order_items 
ALTER COLUMN variations TYPE jsonb USING variations::jsonb;

-- Ensure rental_duration is integer in order_items
ALTER TABLE public.order_items 
ALTER COLUMN rental_duration TYPE integer USING rental_duration::integer;

-- Update products table to ensure proper data types
ALTER TABLE public.products 
ALTER COLUMN price TYPE numeric(10,2) USING price::numeric(10,2);

ALTER TABLE public.products 
ALTER COLUMN rental_price_per_unit TYPE numeric(10,2) USING rental_price_per_unit::numeric(10,2);

ALTER TABLE public.products 
ALTER COLUMN rental_deposit TYPE numeric(10,2) USING rental_deposit::numeric(10,2);

ALTER TABLE public.products 
ALTER COLUMN delivery_price TYPE numeric(10,2) USING delivery_price::numeric(10,2);

ALTER TABLE public.products 
ALTER COLUMN delivery_limit TYPE numeric(10,2) USING delivery_limit::numeric(10,2);

-- Ensure stock quantities are integers
ALTER TABLE public.products 
ALTER COLUMN stock_quantity TYPE integer USING stock_quantity::integer;

ALTER TABLE public.products 
ALTER COLUMN min_order_quantity TYPE integer USING min_order_quantity::integer;

ALTER TABLE public.products 
ALTER COLUMN rental_min_duration TYPE integer USING rental_min_duration::integer;

ALTER TABLE public.products 
ALTER COLUMN rental_max_duration TYPE integer USING rental_max_duration::integer;

-- Update orders table for proper data types
ALTER TABLE public.orders 
ALTER COLUMN subtotal TYPE numeric(10,2) USING subtotal::numeric(10,2);

ALTER TABLE public.orders 
ALTER COLUMN delivery_fee TYPE numeric(10,2) USING delivery_fee::numeric(10,2);

ALTER TABLE public.orders 
ALTER COLUMN total_amount TYPE numeric(10,2) USING total_amount::numeric(10,2);

-- Update order_items for proper data types
ALTER TABLE public.order_items 
ALTER COLUMN unit_price TYPE numeric(10,2) USING unit_price::numeric(10,2);

ALTER TABLE public.order_items 
ALTER COLUMN total_price TYPE numeric(10,2) USING total_price::numeric(10,2);

-- Clean up any invalid data
DELETE FROM public.cart_items WHERE customer_id IS NULL;
DELETE FROM public.cart_items WHERE product_id NOT IN (SELECT id FROM products);
DELETE FROM public.cart_items WHERE quantity <= 0;

-- Update search function to handle both Cyrillic and Latin
CREATE OR REPLACE FUNCTION transliterate_search(input_text text)
RETURNS text AS $$
DECLARE
    result text := input_text;
BEGIN
    -- Cyrillic to Latin transliteration
    result := translate(result, 
        'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
        'abvgdeejzijklmnoprstufxcchshshyeyuyaABVGDEEJZIJKLMNOPRSTUFXCCHSHSHYEYUYA'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the search index
DROP INDEX IF EXISTS idx_products_search;
CREATE INDEX idx_products_search ON public.products USING gin (
    to_tsvector('simple'::regconfig, 
        COALESCE(name_uz, '') || ' ' || 
        COALESCE(description_uz, '') || ' ' ||
        transliterate_search(COALESCE(name_uz, '')) || ' ' ||
        transliterate_search(COALESCE(description_uz, ''))
    )
);

-- Add trigger to update search index when products change
CREATE OR REPLACE FUNCTION update_product_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- This trigger will automatically update the search index
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_search_update ON products;
CREATE TRIGGER product_search_update
    AFTER INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_search_trigger();
