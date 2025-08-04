-- Database fixes and corrections for JamolStroy
-- This script fixes existing table issues and adds missing constraints

-- Fix users table - add missing columns and constraints
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client',
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update users table constraints
ALTER TABLE users ALTER COLUMN last_name SET DEFAULT '';
ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;

-- Fix categories table - add missing columns
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS path TEXT,
ADD COLUMN IF NOT EXISTS products_count NUMERIC;

-- Fix products table - add missing columns and enums
DO $$ 
BEGIN
    -- Create product_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        CREATE TYPE product_type AS ENUM ('sale', 'rental');
    END IF;
    
    -- Create rental_time_unit enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rental_time_unit') THEN
        CREATE TYPE rental_time_unit AS ENUM ('hour', 'day', 'week', 'month');
    END IF;
END $$;

-- Add missing columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type product_type DEFAULT 'sale',
ADD COLUMN IF NOT EXISTS rental_time_unit rental_time_unit,
ADD COLUMN IF NOT EXISTS rental_price_per_unit NUMERIC,
ADD COLUMN IF NOT EXISTS rental_deposit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rental_min_duration INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS rental_max_duration INTEGER,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_delivery BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS minimum_order INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT true;

-- Fix cart_items table - add missing columns and fix constraints
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS rental_duration INTEGER,
ADD COLUMN IF NOT EXISTS rental_time_unit TEXT,
ADD COLUMN IF NOT EXISTS variant_id UUID,
ADD COLUMN IF NOT EXISTS customer_id UUID,
ADD COLUMN IF NOT EXISTS variations JSONB;

-- Add foreign key constraints to cart_items if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'cart_items_variant_id_fkey') THEN
        ALTER TABLE cart_items 
        ADD CONSTRAINT cart_items_variant_id_fkey 
        FOREIGN KEY (variant_id) REFERENCES product_variants(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'cart_items_customer_id_fkey') THEN
        ALTER TABLE cart_items 
        ADD CONSTRAINT cart_items_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES users(id);
    END IF;
END $$;

-- Fix order_items table - add missing columns
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS variant_id UUID,
ADD COLUMN IF NOT EXISTS variations JSONB,
ADD COLUMN IF NOT EXISTS rental_duration INTEGER,
ADD COLUMN IF NOT EXISTS rental_time_unit VARCHAR;

-- Add foreign key constraint to order_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'order_items_variant_id_fkey') THEN
        ALTER TABLE order_items 
        ADD CONSTRAINT order_items_variant_id_fkey 
        FOREIGN KEY (variant_id) REFERENCES product_variants(id);
    END IF;
END $$;

-- Fix orders table - add missing columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_agree BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agreed_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS is_payed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_borrowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS borrowed_period INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS borrowed_additional_period INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS borrowed_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS was_qarzdor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS product_type VARCHAR DEFAULT 'sale',
ADD COLUMN IF NOT EXISTS rental_start_date TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS rental_end_date TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS rental_duration INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS rental_price_per_day NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_deposit_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_returned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS return_date TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS condition_on_return TEXT,
ADD COLUMN IF NOT EXISTS late_return_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS damage_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS address_id UUID,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- Add foreign key constraint to orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'orders_address_id_fkey') THEN
        ALTER TABLE orders 
        ADD CONSTRAINT orders_address_id_fkey 
        FOREIGN KEY (address_id) REFERENCES addresses(id);
    END IF;
END $$;

-- Fix ads table - rename column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'ads' AND column_name = 'cnt_clk') THEN
        ALTER TABLE ads RENAME COLUMN cnt_clk TO click_count;
    END IF;
END $$;

-- Fix company table - add missing columns
ALTER TABLE company 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS time TEXT;

-- Create missing tables

-- Create addresses table if not exists
CREATE TABLE IF NOT EXISTS addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR,
    region VARCHAR,
    postal_code VARCHAR,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_variants table if not exists
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_name VARCHAR NOT NULL,
    specifications JSONB NOT NULL,
    price NUMERIC,
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR,
    images TEXT[],
    is_available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_reviews table if not exists
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    variant_id UUID REFERENCES product_variants(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images TEXT[],
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_views table if not exists
CREATE TABLE IF NOT EXISTS product_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR,
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rental_orders table if not exists
CREATE TABLE IF NOT EXISTS rental_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    customer_id UUID REFERENCES users(id),
    quantity INTEGER NOT NULL,
    rental_duration INTEGER NOT NULL,
    rental_time_unit VARCHAR NOT NULL,
    rental_start_time TIMESTAMP WITH TIME ZONE,
    rental_end_time TIMESTAMP WITH TIME ZONE,
    deposit_amount NUMERIC DEFAULT 0,
    rental_price NUMERIC NOT NULL,
    delivery_address TEXT NOT NULL,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'returned', 'completed')),
    is_confirmed BOOLEAN DEFAULT false,
    is_returned BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create telegram_users table if not exists
CREATE TABLE IF NOT EXISTS telegram_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR DEFAULT '',
    username VARCHAR,
    is_bot BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create telegram_webhooks table if not exists
CREATE TABLE IF NOT EXISTS telegram_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    webhook_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create login_sessions table if not exists
CREATE TABLE IF NOT EXISTS login_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token VARCHAR NOT NULL UNIQUE,
    telegram_id BIGINT NOT NULL,
    user_id UUID REFERENCES users(id),
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    client_id VARCHAR DEFAULT 'jamolstroy_web',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Create oauth_clients table if not exists
CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id VARCHAR NOT NULL UNIQUE,
    client_secret VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    redirect_uris TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create md_passwords table if not exists
CREATE TABLE IF NOT EXISTS md_passwords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(is_default);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_customer_id ON rental_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_telegram_id ON login_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_status ON login_sessions(status);

-- Update triggers for new tables
CREATE TRIGGER update_addresses_updated_at 
    BEFORE UPDATE ON addresses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at 
    BEFORE UPDATE ON product_variants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at 
    BEFORE UPDATE ON product_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_orders_updated_at 
    BEFORE UPDATE ON rental_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_users_updated_at 
    BEFORE UPDATE ON telegram_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_md_passwords_updated_at 
    BEFORE UPDATE ON md_passwords 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ANALYZE;
