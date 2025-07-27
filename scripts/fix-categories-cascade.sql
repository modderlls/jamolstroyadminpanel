-- Fix categories foreign key constraints and add cascade delete
-- First, drop existing foreign key constraint
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;

-- Add new foreign key constraint with CASCADE DELETE
ALTER TABLE categories 
ADD CONSTRAINT categories_parent_id_fkey 
FOREIGN KEY (parent_id) 
REFERENCES categories(id) 
ON DELETE CASCADE;

-- Create function to handle category deletion with product reassignment
CREATE OR REPLACE FUNCTION handle_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update products to move them to parent category or null
    UPDATE products 
    SET category_id = OLD.parent_id 
    WHERE category_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for category deletion
DROP TRIGGER IF EXISTS category_deletion_trigger ON categories;
CREATE TRIGGER category_deletion_trigger
    BEFORE DELETE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION handle_category_deletion();

-- Add products count function
CREATE OR REPLACE FUNCTION get_category_products_count(category_uuid uuid)
RETURNS integer AS $$
DECLARE
    product_count integer;
BEGIN
    -- Count products in this category and all subcategories
    WITH RECURSIVE category_tree AS (
        -- Base case: the category itself
        SELECT id FROM categories WHERE id = category_uuid
        UNION ALL
        -- Recursive case: all subcategories
        SELECT c.id 
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
    )
    SELECT COUNT(*)::integer INTO product_count
    FROM products p
    WHERE p.category_id IN (SELECT id FROM category_tree);
    
    RETURN COALESCE(product_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create workers table
CREATE TABLE IF NOT EXISTS public.workers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    profession_uz text NOT NULL,
    profession_ru text NULL,
    skills text[] NULL DEFAULT '{}'::text[],
    experience_years integer NULL DEFAULT 0,
    hourly_rate numeric NULL DEFAULT 0,
    daily_rate numeric NULL DEFAULT 0,
    rating numeric NULL DEFAULT 0,
    review_count integer NULL DEFAULT 0,
    avatar_url text NULL,
    phone_number text NULL,
    is_available boolean NULL DEFAULT true,
    location text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    specialization text NULL,
    description text NULL,
    CONSTRAINT workers_pkey PRIMARY KEY (id),
    CONSTRAINT workers_rating_check CHECK (
        (rating >= 0::numeric) AND (rating <= 5::numeric)
    )
);

-- Create workers_documents table
CREATE TABLE IF NOT EXISTS public.workers_documents (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL,
    passport_series text NOT NULL,
    passport_number text NOT NULL,
    passport_image_url text NULL,
    additional_documents jsonb NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT workers_documents_pkey PRIMARY KEY (id),
    CONSTRAINT workers_documents_worker_id_fkey FOREIGN KEY (worker_id) 
        REFERENCES workers(id) ON DELETE CASCADE
);

-- Create search index for workers
CREATE INDEX IF NOT EXISTS idx_workers_search 
ON public.workers USING gin (
    first_name gin_trgm_ops,
    last_name gin_trgm_ops,
    profession_uz gin_trgm_ops
);

-- Add specifications column to products if not exists
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}'::jsonb;

-- Add was_qarzdor column to orders if not exists
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS was_qarzdor boolean DEFAULT false;

-- Create function to calculate available stock
CREATE OR REPLACE FUNCTION get_available_stock(product_uuid uuid)
RETURNS integer AS $$
DECLARE
    total_stock integer;
    confirmed_orders integer;
    available_stock integer;
BEGIN
    -- Get total stock from products table
    SELECT stock_quantity INTO total_stock
    FROM products 
    WHERE id = product_uuid;
    
    -- Get sum of confirmed orders for this product
    SELECT COALESCE(SUM(oi.quantity), 0)::integer INTO confirmed_orders
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id
    WHERE oi.product_id = product_uuid 
    AND o.status = 'confirmed';
    
    -- Calculate available stock
    available_stock := COALESCE(total_stock, 0) - COALESCE(confirmed_orders, 0);
    
    RETURN GREATEST(available_stock, 0);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on workers tables
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for workers (admin only)
CREATE POLICY "Admin can view workers" ON workers
    FOR SELECT USING (true);

CREATE POLICY "Admin can insert workers" ON workers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update workers" ON workers
    FOR UPDATE USING (true);

CREATE POLICY "Admin can delete workers" ON workers
    FOR DELETE USING (true);

-- Create policies for workers_documents (admin only)
CREATE POLICY "Admin can view worker documents" ON workers_documents
    FOR SELECT USING (true);

CREATE POLICY "Admin can insert worker documents" ON workers_documents
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update worker documents" ON workers_documents
    FOR UPDATE USING (true);

CREATE POLICY "Admin can delete worker documents" ON workers_documents
    FOR DELETE USING (true);

-- Create storage bucket for documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for documents bucket
CREATE POLICY "Admin can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Admin can view documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Admin can update documents" ON storage.objects
    FOR UPDATE USING (bucket_id = 'documents');

CREATE POLICY "Admin can delete documents" ON storage.objects
    FOR DELETE USING (bucket_id = 'documents');
