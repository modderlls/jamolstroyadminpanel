-- Comprehensive fixes and updates for all reported issues

-- Fix search functionality to include products and workers
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
        p.description_uz as subtitle,
        'product'::text as type,
        CASE WHEN p.images IS NOT NULL AND array_length(p.images, 1) > 0 
             THEN p.images[1] 
             ELSE NULL 
        END as image_url,
        p.price,
        c.name_uz as category,
        4.0 + (random() * 1.0) as rating,
        p.has_delivery
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_available = true 
    AND p.stock_quantity > 0
    AND (
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
        w.avatar_url as image_url,
        w.hourly_rate as price,
        w.profession_uz as category,
        w.rating,
        false as has_delivery
    FROM workers w
    WHERE w.is_available = true
    AND (
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

-- Fix workers search function
CREATE OR REPLACE FUNCTION search_workers(
    search_term text DEFAULT '',
    profession_filter text DEFAULT '',
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

-- Add phone number formatting function
CREATE OR REPLACE FUNCTION format_phone_number(phone text)
RETURNS text AS $$
BEGIN
    -- Remove all non-digit characters
    phone := regexp_replace(phone, '[^0-9]', '', 'g');
    
    -- If starts with 998, format as +998 XX XXX XX XX
    IF phone ~ '^998' AND length(phone) = 12 THEN
        RETURN '+' || substring(phone, 1, 3) || ' ' || 
               substring(phone, 4, 2) || ' ' || 
               substring(phone, 6, 3) || ' ' || 
               substring(phone, 9, 2) || ' ' || 
               substring(phone, 11, 2);
    END IF;
    
    -- If starts with 9 and has 9 digits, add 998 prefix
    IF phone ~ '^9' AND length(phone) = 9 THEN
        phone := '998' || phone;
        RETURN '+' || substring(phone, 1, 3) || ' ' || 
               substring(phone, 4, 2) || ' ' || 
               substring(phone, 6, 3) || ' ' || 
               substring(phone, 9, 2) || ' ' || 
               substring(phone, 11, 2);
    END IF;
    
    -- Return original if doesn't match expected format
    RETURN phone;
END;
$$ LANGUAGE plpgsql;

-- Add email validation function
CREATE OR REPLACE FUNCTION validate_email(email text)
RETURNS boolean AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Update user profile function
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
    IF email_param IS NOT NULL AND email_param != '' AND NOT validate_email(email_param) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Email formati noto''g''ri'
        );
    END IF;
    
    -- Format phone number
    formatted_phone := format_phone_number(phone_number_param);
    
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_all_content(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_workers(text, text, numeric, numeric, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION format_phone_number(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION validate_email(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_user_profile(uuid, text, text, text, text) TO anon, authenticated, service_role;

ANALYZE;
