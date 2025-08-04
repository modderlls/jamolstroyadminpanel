-- Completely drop and recreate search functions with proper table aliases

DROP FUNCTION IF EXISTS search_all_content(text);
DROP FUNCTION IF EXISTS get_search_suggestions(text);

-- Create completely fixed search_all_content function with proper aliases
CREATE OR REPLACE FUNCTION search_all_content(search_query text)
RETURNS TABLE(
    result_id text,
    title text,
    description text,
    price numeric,
    image_url text,
    result_type text,
    category text,
    location text,
    rating numeric,
    has_delivery boolean
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Search products with explicit table aliases
    SELECT 
        p.id::text as result_id,
        p.name_uz as title,
        COALESCE(p.description_uz, '') as description,
        p.price,
        CASE 
            WHEN p.images IS NOT NULL AND array_length(p.images, 1) > 0 
            THEN p.images[1] 
            ELSE '/placeholder.svg'
        END as image_url,
        'product'::text as result_type,
        COALESCE(c.name_uz, '') as category,
        ''::text as location,
        COALESCE(p.average_rating, 0) as rating,
        p.has_delivery
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = true
    AND p.is_available = true
    AND (
        p.name_uz ILIKE '%' || search_query || '%' OR
        p.description_uz ILIKE '%' || search_query || '%' OR
        c.name_uz ILIKE '%' || search_query || '%' OR
        EXISTS (
            SELECT 1 FROM jsonb_each_text(p.specifications) 
            WHERE value ILIKE '%' || search_query || '%'
        )
    )
    
    UNION ALL
    
    -- Search workers with explicit table aliases
    SELECT 
        wp.id::text as result_id,
        (u.first_name || ' ' || u.last_name) as title,
        COALESCE(wp.bio, '') as description,
        COALESCE(wp.hourly_rate, 0) as price,
        COALESCE(wp.profile_image, '/placeholder.svg') as image_url,
        'worker'::text as result_type,
        COALESCE(wp.profession_uz, '') as category,
        COALESCE(wp.location_uz, '') as location,
        COALESCE(wp.rating, 0) as rating,
        false as has_delivery
    FROM worker_profiles wp
    JOIN users u ON wp.user_id = u.id
    WHERE wp.is_available = true
    AND (
        u.first_name ILIKE '%' || search_query || '%' OR
        u.last_name ILIKE '%' || search_query || '%' OR
        wp.profession_uz ILIKE '%' || search_query || '%' OR
        wp.bio ILIKE '%' || search_query || '%'
    )
    
    ORDER BY title
    LIMIT 50;
END;
$$;

-- Create fixed search suggestions function with explicit aliases
CREATE OR REPLACE FUNCTION get_search_suggestions(search_query text)
RETURNS TABLE(suggestion text, suggestion_type text, count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Product name suggestions with explicit alias
    SELECT DISTINCT 
        p.name_uz as suggestion,
        'product'::text as suggestion_type,
        COUNT(*) OVER (PARTITION BY p.name_uz) as count
    FROM products p
    WHERE p.is_active = true
    AND p.is_available = true
    AND p.name_uz ILIKE '%' || search_query || '%'
    
    UNION ALL
    
    -- Category suggestions with explicit alias
    SELECT DISTINCT 
        c.name_uz as suggestion,
        'category'::text as suggestion_type,
        COUNT(*) OVER (PARTITION BY c.name_uz) as count
    FROM categories c
    WHERE c.is_active = true
    AND c.name_uz ILIKE '%' || search_query || '%'
    
    UNION ALL
    
    -- Worker profession suggestions with explicit alias
    SELECT DISTINCT 
        wp.profession_uz as suggestion,
        'profession'::text as suggestion_type,
        COUNT(*) OVER (PARTITION BY wp.profession_uz) as count
    FROM worker_profiles wp
    WHERE wp.is_available = true
    AND wp.profession_uz IS NOT NULL
    AND wp.profession_uz ILIKE '%' || search_query || '%'
    
    ORDER BY count DESC, suggestion
    LIMIT 10;
END;
$$;
