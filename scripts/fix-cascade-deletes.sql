-- Fix foreign key constraints to allow cascade deletes

-- Drop existing foreign key constraints
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;

-- Add foreign key constraints with CASCADE DELETE
ALTER TABLE order_items 
ADD CONSTRAINT order_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE order_items 
ADD CONSTRAINT order_items_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Also fix categories foreign key
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;
ALTER TABLE categories 
ADD CONSTRAINT categories_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE;

-- Fix products category foreign key
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE products 
ADD CONSTRAINT products_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Foreign key constraints updated with CASCADE DELETE!';
END $$;
