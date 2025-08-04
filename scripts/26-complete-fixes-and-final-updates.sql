-- Complete fixes for all reported issues

-- Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS search_all_content(text, integer);
DROP FUNCTION IF EXISTS search_workers(text, text, numeric, numeric, integer);
DROP FUNCTION IF EXISTS get_search_suggestions(text, integer);
DROP FUNCTION IF EXISTS update_user_profile(uuid, text, text, text, text);

-- Create workers table if it doesn't exist (using worker_profiles)
CREATE TABLE IF NOT EXISTS workers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    profession_uz text NOT NULL,
    profession_ru text,
    skills text[] DEFAULT '{}',
    experience_years integer DEFAULT 0,
    hourly_rate numeric DEFAULT 0,
    daily_rate numeric DEFAULT 0,
    rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    review_count integer DEFAULT 0,
    avatar_url text,
    phone_number text,
    is_available boolean DEFAULT true,
    location text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert sample workers data
INSERT INTO workers (first_name, last_name, profession_uz, profession_ru, skills, experience_years, hourly_rate, daily_rate, rating, review_count, phone_number, location) VALUES
('Akmal', 'Karimov', 'Qurilish ustasi', 'Строитель', ARRAY['Beton', 'G''isht', 'Plitka'], 5, 25000, 200000, 4.8, 45, '+998 90 123 45 67', 'Toshkent'),
('Bobur', 'Rahimov', 'Elektrik', 'Электрик', ARRAY['Elektr montaj', 'Kabel', 'Rozetka'], 3, 30000, 240000, 4.5, 32, '+998 91 234 56 78', 'Samarqand'),
('Dilshod', 'Toshmatov', 'Santexnik', 'Сантехник', ARRAY['Quvur', 'Kran', 'Vannaxona'], 7, 28000, 220000, 4.9, 67, '+998 93 345 67 89', 'Buxoro'),
('Erkin', 'Nazarov', 'Usta', 'Мастер', ARRAY['Ta''mir', 'Montaj', 'Dizayn'], 4, 22000, 180000, 4.6, 28, '+998 94 456 78 90', 'Namangan'),
('Farrux', 'Olimov', 'Kranchi', 'Крановщик', ARRAY['Kran boshqarish', 'Yuk ko''tarish'], 8, 35000, 280000, 4.7, 52, '+998 95 567 89 01', 'Andijon')
ON CONFLICT (id) DO NOTHING;

-- Fix search function for all content
CREATE OR REPLACE FUNCTION search_all_content(search_term text, limit_count integer DEFAULT 20)
RETURNS TABLE(
    id uuid,
    title text,
    subtitle text,
    type text,
    image_url text,
    price numeric,
    category text,
    rating numeric,
    has_delivery boolean
) AS $$
BEGIN
    RETURN QUERY
    -- Search products
    SELECT 
        p.id,
        p.name_uz as title,
        COALESCE(p.description_uz, '') as subtitle,
        'product'::text as type,
        CASE WHEN p.images IS NOT NULL AND array_length(p.images, 1) > 0 
             THEN p.images[1] 
             ELSE '/placeholder.svg'
        END as image_url,
        p.price,
        COALESCE(c.name_uz, '') as category,
        (4.0 + (random() * 1.0))::numeric as rating,
        p.has_delivery
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_available = true 
    AND p.stock_quantity > 0
    AND (
        search_term = '' OR
        p.name_uz ILIKE '%' || search_term || '%' OR
        p.description_uz ILIKE '%' || search_term || '%' OR
        c.name_uz ILIKE '%' || search_term || '%'
    )
    ORDER BY 
        CASE WHEN p.name_uz ILIKE search_term || '%' THEN 1 ELSE 2 END,
        p.is_featured DESC,
        p.view_count DESC
    LIMIT limit_count/2

    UNION ALL

    -- Search workers
    SELECT 
        w.id,
        (w.first_name || ' ' || w.last_name) as title,
        w.profession_uz as subtitle,
        'worker'::text as type,
        COALESCE(w.avatar_url, '/placeholder.svg') as image_url,
        w.hourly_rate as price,
        w.profession_uz as category,
        w.rating,
        false as has_delivery
    FROM workers w
    WHERE w.is_available = true
    AND (
        search_term = '' OR
        w.first_name ILIKE '%' || search_term || '%' OR
        w.last_name ILIKE '%' || search_term || '%' OR
        w.profession_uz ILIKE '%' || search_term || '%' OR
        EXISTS (
            SELECT 1 FROM unnest(w.skills) as skill 
            WHERE skill ILIKE '%' || search_term || '%'
        )
    )
    ORDER BY w.rating DESC, w.experience_years DESC
    LIMIT limit_count/2;
END;
$$ LANGUAGE plpgsql;

-- Fix workers search function
CREATE OR REPLACE FUNCTION search_workers(
    search_term text DEFAULT '',
    profession_filter text DEFAULT '',
    location_filter text DEFAULT '',
    min_rating numeric DEFAULT 0,
    max_hourly_rate numeric DEFAULT 999999,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    id uuid,
    first_name text,
    last_name text,
    profession_uz text,
    profession_ru text,
    skills text[],
    experience_years integer,
    hourly_rate numeric,
    daily_rate numeric,
    rating numeric,
    review_count integer,
    avatar_url text,
    phone_number text,
    is_available boolean,
    location text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.first_name,
        w.last_name,
        w.profession_uz,
        w.profession_ru,
        w.skills,
        w.experience_years,
        w.hourly_rate,
        w.daily_rate,
        w.rating,
        w.review_count,
        w.avatar_url,
        w.phone_number,
        w.is_available,
        w.location
    FROM workers w
    WHERE w.is_available = true
    AND w.rating >= min_rating
    AND w.hourly_rate <= max_hourly_rate
    AND (profession_filter = '' OR w.profession_uz = profession_filter)
    AND (location_filter = '' OR w.location ILIKE '%' || location_filter || '%')
    AND (
        search_term = '' OR
        w.first_name ILIKE '%' || search_term || '%' OR
        w.last_name ILIKE '%' || search_term || '%' OR
        w.profession_uz ILIKE '%' || search_term || '%' OR
        EXISTS (
            SELECT 1 FROM unnest(w.skills) as skill 
            WHERE skill ILIKE '%' || search_term || '%'
        )
    )
    ORDER BY w.rating DESC, w.experience_years DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Update get_search_suggestions to include all content types
CREATE OR REPLACE FUNCTION get_search_suggestions(search_term text, limit_count integer DEFAULT 8)
RETURNS TABLE(suggestion text, type text, count integer) AS $$
BEGIN
    RETURN QUERY
    -- Product suggestions
    SELECT DISTINCT 
        p.name_uz as suggestion, 
        'product'::text as type,
        1 as count
    FROM products p
    WHERE p.name_uz ILIKE '%' || search_term || '%' 
    AND p.is_available = true
    ORDER BY p.name_uz
    LIMIT limit_count/3
    
    UNION ALL
    
    -- Category suggestions  
    SELECT DISTINCT 
        c.name_uz as suggestion, 
        'category'::text as type,
        1 as count
    FROM categories c
    WHERE c.name_uz ILIKE '%' || search_term || '%'
    AND c.is_active = true
    ORDER BY c.name_uz
    LIMIT limit_count/3

    UNION ALL

    -- Worker suggestions
    SELECT DISTINCT 
        w.profession_uz as suggestion,
        'worker'::text as type,
        1 as count
    FROM workers w
    WHERE w.profession_uz ILIKE '%' || search_term || '%'
    AND w.is_available = true
    ORDER BY w.profession_uz
    LIMIT limit_count/3;
END;
$$ LANGUAGE plpgsql;

-- Create update_user_profile function
CREATE OR REPLACE FUNCTION update_user_profile(
    user_id_param uuid,
    first_name_param text,
    last_name_param text,
    phone_number_param text,
    email_param text
)
RETURNS jsonb AS $$
DECLARE
    formatted_phone text;
BEGIN
    -- Validate email if provided
    IF email_param IS NOT NULL AND email_param != '' AND NOT (email_param ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Email formati noto''g''ri'
        );
    END IF;
    
    -- Format phone number
    formatted_phone := phone_number_param;
    IF phone_number_param IS NOT NULL AND phone_number_param != '' THEN
        -- Remove all non-digit characters
        formatted_phone := regexp_replace(phone_number_param, '[^0-9]', '', 'g');
        
        -- If starts with 998, format as +998 XX XXX XX XX
        IF formatted_phone ~ '^998' AND length(formatted_phone) = 12 THEN
            formatted_phone := '+' || substring(formatted_phone, 1, 3) || ' ' || 
                   substring(formatted_phone, 4, 2) || ' ' || 
                   substring(formatted_phone, 6, 3) || ' ' || 
                   substring(formatted_phone, 9, 2) || ' ' || 
                   substring(formatted_phone, 11, 2);
        -- If starts with 9 and has 9 digits, add 998 prefix
        ELSIF formatted_phone ~ '^9' AND length(formatted_phone) = 9 THEN
            formatted_phone := '998' || formatted_phone;
            formatted_phone := '+' || substring(formatted_phone, 1, 3) || ' ' || 
                   substring(formatted_phone, 4, 2) || ' ' || 
                   substring(formatted_phone, 6, 3) || ' ' || 
                   substring(formatted_phone, 9, 2) || ' ' || 
                   substring(formatted_phone, 11, 2);
        END IF;
    END IF;
    
    -- Update user profile
    UPDATE users SET
        first_name = first_name_param,
        last_name = last_name_param,
        phone_number = formatted_phone,
        email = CASE WHEN email_param = '' THEN NULL ELSE email_param END,
        updated_at = now()
    WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Foydalanuvchi topilmadi'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profil muvaffaqiyatli yangilandi',
        'formatted_phone', formatted_phone
    );
END;
$$ LANGUAGE plpgsql;

-- Create addresses table if not exists
CREATE TABLE IF NOT EXISTS addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    address text NOT NULL,
    city text,
    region text,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create reviews table if not exists
CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    comment text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Function to get user addresses
CREATE OR REPLACE FUNCTION get_user_addresses(user_id_param uuid)
RETURNS TABLE(
    id uuid,
    name text,
    address text,
    city text,
    region text,
    is_default boolean,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.address,
        a.city,
        a.region,
        a.is_default,
        a.created_at
    FROM addresses a
    WHERE a.user_id = user_id_param
    ORDER BY a.is_default DESC, a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user reviews
CREATE OR REPLACE FUNCTION get_user_reviews(user_id_param uuid)
RETURNS TABLE(
    id uuid,
    product_name text,
    rating integer,
    comment text,
    is_verified boolean,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        p.name_uz as product_name,
        r.rating,
        r.comment,
        r.is_verified,
        r.created_at
    FROM reviews r
    JOIN products p ON r.product_id = p.id
    WHERE r.user_id = user_id_param
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to add address
CREATE OR REPLACE FUNCTION add_user_address(
    user_id_param uuid,
    name_param text,
    address_param text,
    city_param text DEFAULT NULL,
    region_param text DEFAULT NULL,
    is_default_param boolean DEFAULT false
)
RETURNS jsonb AS $$
DECLARE
    new_address_id uuid;
BEGIN
    -- If this is set as default, unset other defaults
    IF is_default_param THEN
        UPDATE addresses SET is_default = false WHERE user_id = user_id_param;
    END IF;
    
    -- Insert new address
    INSERT INTO addresses (user_id, name, address, city, region, is_default)
    VALUES (user_id_param, name_param, address_param, city_param, region_param, is_default_param)
    RETURNING id INTO new_address_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Manzil muvaffaqiyatli qo''shildi',
        'address_id', new_address_id
    );
END;
$$ LANGUAGE plpgsql;

-- Fix delivery calculation function
CREATE OR REPLACE FUNCTION calculate_delivery_with_threshold(customer_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    cart_total numeric := 0;
    original_delivery_fee numeric := 0;
    free_delivery_threshold numeric := 200000;
    delivery_discount numeric := 0;
    final_delivery_fee numeric := 0;
    has_delivery_items boolean := false;
    discount_percentage integer := 0;
BEGIN
    -- Calculate cart total and delivery info
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN p.product_type = 'rental' AND p.rental_price_per_unit IS NOT NULL AND ci.rental_duration IS NOT NULL
                THEN p.rental_price_per_unit * ci.rental_duration * ci.quantity
                ELSE p.price * ci.quantity
            END
        ), 0),
        COALESCE(MAX(
            CASE WHEN p.has_delivery THEN p.delivery_price ELSE 0 END
        ), 0),
        bool_or(p.has_delivery)
    INTO cart_total, original_delivery_fee, has_delivery_items
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.customer_id = customer_id_param;
    
    -- Calculate delivery discount if applicable
    IF has_delivery_items AND cart_total >= free_delivery_threshold THEN
        delivery_discount := original_delivery_fee;
        discount_percentage := 100;
        final_delivery_fee := 0;
    ELSE
        final_delivery_fee := original_delivery_fee;
    END IF;
    
    RETURN jsonb_build_object(
        'cart_total', cart_total,
        'original_delivery_fee', original_delivery_fee,
        'delivery_discount', delivery_discount,
        'final_delivery_fee', final_delivery_fee,
        'free_delivery_threshold', free_delivery_threshold,
        'has_delivery_items', has_delivery_items,
        'discount_percentage', discount_percentage
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_all_content(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_workers(text, text, text, numeric, numeric, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_search_suggestions(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_user_profile(uuid, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_addresses(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_reviews(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_user_address(uuid, text, text, text, text, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION calculate_delivery_with_threshold(uuid) TO anon, authenticated, service_role;

-- Grant table permissions
GRANT ALL ON addresses TO anon, authenticated, service_role;
GRANT ALL ON reviews TO anon, authenticated, service_role;
GRANT ALL ON workers TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- RLS policies for addresses
CREATE POLICY "Users can view own addresses" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON addresses FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for reviews
CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);

-- RLS policies for workers
CREATE POLICY "Anyone can view workers" ON workers FOR SELECT USING (true);

ANALYZE;
