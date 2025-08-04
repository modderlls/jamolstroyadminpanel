-- Remove Russian language columns from products table
ALTER TABLE public.products DROP COLUMN IF EXISTS name_ru;
ALTER TABLE public.products DROP COLUMN IF EXISTS description_ru;

-- Create addresses table for user address management
CREATE TABLE IF NOT EXISTS public.addresses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    address text NOT NULL,
    city character varying(100),
    region character varying(100),
    postal_code character varying(20),
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT addresses_pkey PRIMARY KEY (id),
    CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for addresses table
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON public.addresses USING btree (is_default);

-- Add address_id to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address_id uuid;
ALTER TABLE public.orders ADD CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL;

-- Update orders table to allow null delivery_fee
ALTER TABLE public.orders ALTER COLUMN delivery_fee DROP NOT NULL;

-- Add variations column to order_items for storing selected variations
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variations jsonb;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS rental_duration integer;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS rental_time_unit character varying(20);

-- Create product_reviews table if not exists
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid,
    customer_id uuid,
    order_id uuid,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT product_reviews_pkey PRIMARY KEY (id),
    CONSTRAINT product_reviews_product_id_customer_id_order_id_key UNIQUE (product_id, customer_id, order_id),
    CONSTRAINT product_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT product_reviews_rating_check CHECK ((rating >= 1) AND (rating <= 5))
);

-- Create indexes for product_reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_customer_id ON public.product_reviews USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id ON public.product_reviews USING btree (order_id);

-- Create trigger for addresses updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_addresses_updated_at 
    BEFORE UPDATE ON addresses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at 
    BEFORE UPDATE ON product_reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update search index to work with both Cyrillic and Latin characters
DROP INDEX IF EXISTS idx_products_search;
CREATE INDEX idx_products_search ON public.products USING gin (
    to_tsvector('simple'::regconfig, 
        COALESCE(name_uz, '') || ' ' || 
        COALESCE(description_uz, '') || ' ' ||
        -- Add transliteration support for better search
        translate(COALESCE(name_uz, ''), 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя', 'abvgdeejzijklmnoprstufxcchshshyeyuya') || ' ' ||
        translate(COALESCE(description_uz, ''), 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя', 'abvgdeejzijklmnoprstufxcchshshyeyuya')
    )
);

-- Sample data for addresses (optional)
INSERT INTO public.addresses (user_id, name, address, is_default) 
SELECT 
    u.id,
    'Uy manzili',
    'Toshkent shahar, Chilonzor tumani, 1-kvartal, 5-uy',
    true
FROM users u 
WHERE u.role = 'customer' 
AND NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = u.id)
LIMIT 5;

-- Sample product specifications data
UPDATE products SET specifications = jsonb_build_object(
    'color', jsonb_build_array(
        jsonb_build_object('name', 'Oq', 'value', 'white', 'price', null),
        jsonb_build_object('name', 'Qora', 'value', 'black', 'price', 5000),
        jsonb_build_object('name', 'Kulrang', 'value', 'gray', 'price', 3000)
    ),
    'size', jsonb_build_array(
        jsonb_build_object('name', 'Kichik', 'value', 'small', 'price', null),
        jsonb_build_object('name', 'O''rta', 'value', 'medium', 'price', 10000),
        jsonb_build_object('name', 'Katta', 'value', 'large', 'price', 20000)
    )
) WHERE category_id IN (SELECT id FROM categories LIMIT 3);

UPDATE products SET specifications = jsonb_build_object(
    'material', jsonb_build_array(
        jsonb_build_object('name', 'Temir', 'value', 'iron', 'price', null),
        jsonb_build_object('name', 'Alyuminiy', 'value', 'aluminum', 'price', 15000),
        jsonb_build_object('name', 'Plastik', 'value', 'plastic', 'price', -5000)
    ),
    'brand', jsonb_build_array(
        jsonb_build_object('name', 'JamolStroy', 'value', 'jamolstroy', 'price', null),
        jsonb_build_object('name', 'Premium', 'value', 'premium', 'price', 25000)
    )
) WHERE specifications IS NULL AND category_id IN (SELECT id FROM categories OFFSET 3 LIMIT 3);
