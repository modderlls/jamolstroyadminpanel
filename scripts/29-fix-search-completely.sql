-- Completely fix search functions with proper column references

-- Drop existing functions
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
BEGIN
    RETURN QUERY
    -- Search products
    SELECT 
        products.id::text as result_id,
        products.name_uz as title,
        COALESCE(products.description_uz, '') as description,
        products.price,
        CASE 
            WHEN products.images IS NOT NULL AND array_length(products.images, 1) > 0 
            THEN products.images[1] 
            ELSE '/placeholder.svg'
        END as image_url,
        'product'::text as result_type,
        COALESCE(categories.name_uz, '') as category,
        ''::text as location,
        COALESCE(products.average_rating, 0) as rating,
        products.has_delivery
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    WHERE products.is_active = true
    AND products.is_available = true
    AND (
        products.name_uz ILIKE '%' || search_query || '%' OR
        products.description_uz ILIKE '%' || search_query || '%' OR
        categories.name_uz ILIKE '%' || search_query || '%' OR
        EXISTS (
            SELECT 1 FROM jsonb_each_text(products.specifications) 
            WHERE value ILIKE '%' || search_query || '%'
        )
    )
    
    UNION ALL
    
    -- Search workers
    SELECT 
        worker_profiles.id::text as result_id,
        (users.first_name || ' ' || users.last_name) as title,
        COALESCE(worker_profiles.bio, '') as description,
        COALESCE(worker_profiles.hourly_rate, 0) as price,
        COALESCE(worker_profiles.profile_image, '/placeholder.svg') as image_url,
        'worker'::text as result_type,
        COALESCE(worker_profiles.profession_uz, '') as category,
        COALESCE(worker_profiles.location_uz, '') as location,
        COALESCE(worker_profiles.rating, 0) as rating,
        false as has_delivery
    FROM worker_profiles
    JOIN users ON worker_profiles.user_id = users.id
    WHERE worker_profiles.is_available = true
    AND (
        users.first_name ILIKE '%' || search_query || '%' OR
        users.last_name ILIKE '%' || search_query || '%' OR
        worker_profiles.profession_uz ILIKE '%' || search_query || '%' OR
        worker_profiles.bio ILIKE '%' || search_query || '%'
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
BEGIN
    RETURN QUERY
    -- Product name suggestions
    SELECT DISTINCT 
        products.name_uz as suggestion,
        'product'::text as suggestion_type,
        COUNT(*) OVER (PARTITION BY products.name_uz) as count
    FROM products
    WHERE products.is_active = true
    AND products.is_available = true
    AND products.name_uz ILIKE '%' || search_query || '%'
    
    UNION ALL
    
    -- Category suggestions
    SELECT DISTINCT 
        categories.name_uz as suggestion,
        'category'::text as suggestion_type,
        COUNT(*) OVER (PARTITION BY categories.name_uz) as count
    FROM categories
    WHERE categories.is_active = true
    AND categories.name_uz ILIKE '%' || search_query || '%'
    
    UNION ALL
    
    -- Worker profession suggestions
    SELECT DISTINCT 
        worker_profiles.profession_uz as suggestion,
        'profession'::text as suggestion_type,
        COUNT(*) OVER (PARTITION BY worker_profiles.profession_uz) as count
    FROM worker_profiles
    WHERE worker_profiles.is_available = true
    AND worker_profiles.profession_uz IS NOT NULL
    AND worker_profiles.profession_uz ILIKE '%' || search_query || '%'
    
    ORDER BY count DESC, suggestion
    LIMIT 10;
END;
$$;

-- Add sample specifications data to products
UPDATE products SET specifications = jsonb_build_object(
    'material', 'Yuqori sifatli sement',
    'strength', 'M400',
    'package', '50kg qop',
    'origin', 'O''zbekiston'
) WHERE name_uz = 'Sement M400';

UPDATE products SET specifications = jsonb_build_object(
    'material', 'Loy g''isht',
    'size', '250x120x65mm',
    'color', 'Qizil',
    'strength', 'M100'
) WHERE name_uz = 'G''isht qizil';

UPDATE products SET specifications = jsonb_build_object(
    'type', 'NYM kabel',
    'cross_section', '2.5mm²',
    'voltage', '450/750V',
    'insulation', 'PVC'
) WHERE name_uz = 'Elektr kabeli';

UPDATE products SET specifications = jsonb_build_object(
    'type', 'Schuko rozetka',
    'voltage', '220V',
    'current', '16A',
    'protection', 'IP20'
) WHERE name_uz = 'Rozetka';

UPDATE products SET specifications = jsonb_build_object(
    'type', 'Vannaxona krani',
    'material', 'Latun',
    'finish', 'Xrom',
    'connection', '1/2 dyuym'
) WHERE name_uz = 'Kran';

UPDATE products SET specifications = jsonb_build_object(
    'type', 'Akril bo''yoq',
    'color', 'Oq',
    'coverage', '12-14 m²/litr',
    'drying_time', '2-4 soat'
) WHERE name_uz = 'Bo''yoq oq';

UPDATE products SET specifications = jsonb_build_object(
    'power', '650W',
    'chuck', '13mm',
    'speed', '0-3000 rpm',
    'brand', 'Professional'
) WHERE name_uz = 'Drill';

UPDATE products SET specifications = jsonb_build_object(
    'power', '1200W',
    'impact_energy', '5J',
    'chuck', 'SDS-Plus',
    'brand', 'Heavy Duty'
) WHERE name_uz = 'Perforator ijara';
