-- Completely drop and recreate search functions without any ambiguous references

DROP FUNCTION IF EXISTS search_all_content(text);
DROP FUNCTION IF EXISTS get_search_suggestions(text);

-- Create completely fixed search_all_content function
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
DECLARE
    _search_term text := LOWER(TRIM(search_query));
BEGIN
    -- Return empty if search term is too short
    IF LENGTH(_search_term) < 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
    -- Search products
    SELECT 
        prod.id::text,
        prod.name_uz,
        COALESCE(prod.description_uz, ''),
        prod.price,
        CASE 
            WHEN prod.images IS NOT NULL AND array_length(prod.images, 1) > 0 
            THEN prod.images[1] 
            ELSE '/placeholder.svg'
        END,
        'product'::text,
        COALESCE(cat.name_uz, ''),
        ''::text,
        COALESCE(prod.average_rating, 0),
        prod.has_delivery
    FROM products prod
    LEFT JOIN categories cat ON prod.category_id = cat.id
    WHERE prod.is_active = true
    AND prod.is_available = true
    AND (
        LOWER(prod.name_uz) LIKE '%' || _search_term || '%' OR
        LOWER(COALESCE(prod.description_uz, '')) LIKE '%' || _search_term || '%' OR
        LOWER(COALESCE(cat.name_uz, '')) LIKE '%' || _search_term || '%' OR
        EXISTS (
            SELECT 1 FROM jsonb_each_text(prod.specifications) spec
            WHERE LOWER(spec.value) LIKE '%' || _search_term || '%'
        )
    )
    
    UNION ALL
    
    -- Search workers
    SELECT 
        worker.id::text,
        (usr.first_name || ' ' || usr.last_name),
        COALESCE(worker.bio, ''),
        COALESCE(worker.hourly_rate, 0),
        COALESCE(worker.profile_image, '/placeholder.svg'),
        'worker'::text,
        COALESCE(worker.profession_uz, ''),
        COALESCE(worker.location_uz, ''),
        COALESCE(worker.rating, 0),
        false
    FROM worker_profiles worker
    JOIN users usr ON worker.user_id = usr.id
    WHERE worker.is_available = true
    AND (
        LOWER(usr.first_name) LIKE '%' || _search_term || '%' OR
        LOWER(usr.last_name) LIKE '%' || _search_term || '%' OR
        LOWER(COALESCE(worker.profession_uz, '')) LIKE '%' || _search_term || '%' OR
        LOWER(COALESCE(worker.bio, '')) LIKE '%' || _search_term || '%'
    )
    
    ORDER BY title
    LIMIT 50;
END;
$$;

-- Create fixed search suggestions function
CREATE OR REPLACE FUNCTION get_search_suggestions(search_query text)
RETURNS TABLE(suggestion text, suggestion_type text, count bigint)
LANGUAGE plpgsql
AS $$
DECLARE
    _search_term text := LOWER(TRIM(search_query));
BEGIN
    -- Return empty if search term is too short
    IF LENGTH(_search_term) < 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
    -- Product name suggestions
    SELECT DISTINCT 
        prod.name_uz,
        'product'::text,
        COUNT(*) OVER (PARTITION BY prod.name_uz)
    FROM products prod
    WHERE prod.is_active = true
    AND prod.is_available = true
    AND LOWER(prod.name_uz) LIKE '%' || _search_term || '%'
    
    UNION ALL
    
    -- Category suggestions
    SELECT DISTINCT 
        cat.name_uz,
        'category'::text,
        COUNT(*) OVER (PARTITION BY cat.name_uz)
    FROM categories cat
    WHERE cat.is_active = true
    AND LOWER(cat.name_uz) LIKE '%' || _search_term || '%'
    
    UNION ALL
    
    -- Worker profession suggestions
    SELECT DISTINCT 
        worker.profession_uz,
        'profession'::text,
        COUNT(*) OVER (PARTITION BY worker.profession_uz)
    FROM worker_profiles worker
    WHERE worker.is_available = true
    AND worker.profession_uz IS NOT NULL
    AND LOWER(worker.profession_uz) LIKE '%' || _search_term || '%'
    
    ORDER BY count DESC, suggestion
    LIMIT 10;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_all_content(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_suggestions(text) TO authenticated;
