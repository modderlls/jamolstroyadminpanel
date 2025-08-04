-- Fix search functions with proper column references and type handling

-- Drop existing functions
DROP FUNCTION IF EXISTS search_all_content(text);
DROP FUNCTION IF EXISTS get_search_suggestions(text);

-- Create improved search_all_content function
CREATE OR REPLACE FUNCTION search_all_content(search_query text)
RETURNS TABLE(
    id text,
    title text,
    description text,
    price numeric,
    image_url text,
    type text,
    category text,
    location text,
    rating numeric,
    has_delivery boolean
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Search products
    SELECT 
        p.id::text,
        p.name_uz as title,
        COALESCE(p.description_uz, '') as description,
        p.price,
        CASE 
            WHEN p.images IS NOT NULL AND array_length(p.images, 1) > 0 
            THEN p.images[1] 
            ELSE '/placeholder.svg'
        END as image_url,
        'product'::text as type,
        COALESCE(c.name_uz, '') as category,
        ''::text as location,
        COALESCE(p.average_rating, 0) as rating,
        p.has_delivery
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = true
    AND (
        p.name_uz ILIKE '%' || search_query || '%' OR
        p.description_uz ILIKE '%' || search_query || '%' OR
        c.name_uz ILIKE '%' || search_query || '%'
    )
    
    UNION ALL
    
    -- Search workers
    SELECT 
        w.id::text,
        (w.first_name || ' ' || w.last_name) as title,
        COALESCE(w.bio, '') as description,
        COALESCE(w.hourly_rate, 0) as price,
        COALESCE(w.profile_image, '/placeholder.svg') as image_url,
        'worker'::text as type,
        COALESCE(w.profession, '') as category,
        COALESCE(w.location, '') as location,
        COALESCE(w.rating, 0) as rating,
        false as has_delivery
    FROM workers w
    WHERE w.is_active = true
    AND (
        w.first_name ILIKE '%' || search_query || '%' OR
        w.last_name ILIKE '%' || search_query || '%' OR
        w.profession ILIKE '%' || search_query || '%' OR
        w.bio ILIKE '%' || search_query || '%'
    )
    
    ORDER BY title
    LIMIT 50;
END;
$$;

-- Create improved search suggestions function
CREATE OR REPLACE FUNCTION get_search_suggestions(search_query text)
RETURNS TABLE(suggestion text, type text, count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Product name suggestions
    SELECT DISTINCT 
        p.name_uz as suggestion,
        'product'::text as type,
        COUNT(*) OVER (PARTITION BY p.name_uz) as count
    FROM products p
    WHERE p.is_active = true
    AND p.name_uz ILIKE '%' || search_query || '%'
    
    UNION ALL
    
    -- Category suggestions
    SELECT DISTINCT 
        c.name_uz as suggestion,
        'category'::text as type,
        COUNT(*) OVER (PARTITION BY c.name_uz) as count
    FROM categories c
    WHERE c.is_active = true
    AND c.name_uz ILIKE '%' || search_query || '%'
    
    UNION ALL
    
    -- Worker profession suggestions
    SELECT DISTINCT 
        w.profession as suggestion,
        'profession'::text as type,
        COUNT(*) OVER (PARTITION BY w.profession) as count
    FROM workers w
    WHERE w.is_active = true
    AND w.profession IS NOT NULL
    AND w.profession ILIKE '%' || search_query || '%'
    
    ORDER BY count DESC, suggestion
    LIMIT 10;
END;
$$;

-- Update delivery settings to 200,000 som threshold
UPDATE company 
SET delivery_settings = jsonb_set(
    COALESCE(delivery_settings, '{}'::jsonb),
    '{free_delivery_threshold}',
    '200000'::jsonb
)
WHERE is_active = true;

-- Update any existing delivery fee calculations
CREATE OR REPLACE FUNCTION calculate_delivery_fee(customer_id_param uuid)
RETURNS TABLE(
    has_delivery_items boolean,
    cart_total numeric,
    original_delivery_fee numeric,
    free_delivery_threshold numeric,
    delivery_discount numeric,
    discount_percentage integer,
    final_delivery_fee numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    delivery_items_exist boolean := false;
    total_amount numeric := 0;
    base_delivery_fee numeric := 15000; -- Base delivery fee
    free_threshold numeric := 200000; -- Updated to 200,000 som
    discount_amount numeric := 0;
    discount_percent integer := 0;
    final_fee numeric := 0;
BEGIN
    -- Check if user has delivery items in cart
    SELECT EXISTS(
        SELECT 1 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = customer_id_param 
        AND p.has_delivery = true
    ) INTO delivery_items_exist;
    
    IF NOT delivery_items_exist THEN
        RETURN QUERY SELECT 
            false, 0::numeric, 0::numeric, free_threshold, 
            0::numeric, 0, 0::numeric;
        RETURN;
    END IF;
    
    -- Calculate cart total for delivery items
    SELECT COALESCE(SUM(p.price * ci.quantity), 0)
    INTO total_amount
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = customer_id_param 
    AND p.has_delivery = true;
    
    -- Calculate delivery fee
    IF total_amount >= free_threshold THEN
        discount_amount := base_delivery_fee;
        discount_percent := 100;
        final_fee := 0;
    ELSE
        discount_amount := 0;
        discount_percent := 0;
        final_fee := base_delivery_fee;
    END IF;
    
    RETURN QUERY SELECT 
        delivery_items_exist,
        total_amount,
        base_delivery_fee,
        free_threshold,
        discount_amount,
        discount_percent,
        final_fee;
END;
$$;
