-- Fix all errors and complete missing features

-- Fix the get_popular_searches function
CREATE OR REPLACE FUNCTION get_popular_searches(limit_count integer DEFAULT 10)
RETURNS TABLE(query text, count integer) AS $$
BEGIN
    RETURN QUERY
    SELECT sq.query, sq.search_count as count
    FROM search_queries sq
    WHERE LENGTH(sq.query) > 2
    ORDER BY sq.search_count DESC, sq.last_searched DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create search_queries table if it doesn't exist
CREATE TABLE IF NOT EXISTS search_queries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    query text UNIQUE NOT NULL,
    search_count integer DEFAULT 1,
    last_searched timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Create index for search queries
CREATE INDEX IF NOT EXISTS idx_search_queries_count ON search_queries(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query);

-- Function to track search queries
CREATE OR REPLACE FUNCTION track_search_query(search_query text)
RETURNS void AS $$
BEGIN
    INSERT INTO search_queries (query, search_count, last_searched)
    VALUES (LOWER(TRIM(search_query)), 1, now())
    ON CONFLICT (query) DO UPDATE SET
        search_count = search_queries.search_count + 1,
        last_searched = now();
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(search_term text, limit_count integer DEFAULT 5)
RETURNS TABLE(suggestion text, type text) AS $$
BEGIN
    RETURN QUERY
    -- Product suggestions
    SELECT DISTINCT p.name_uz as suggestion, 'product'::text as type
    FROM products p
    WHERE p.name_uz ILIKE '%' || search_term || '%' 
    AND p.is_available = true
    ORDER BY p.name_uz
    LIMIT limit_count/2
    
    UNION ALL
    
    -- Category suggestions  
    SELECT DISTINCT c.name_uz as suggestion, 'category'::text as type
    FROM categories c
    WHERE c.name_uz ILIKE '%' || search_term || '%'
    AND c.is_active = true
    ORDER BY c.name_uz
    LIMIT limit_count/2;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate delivery with free threshold
CREATE OR REPLACE FUNCTION calculate_delivery_with_threshold(customer_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    cart_total numeric := 0;
    max_delivery_fee numeric := 0;
    free_delivery_threshold numeric := 200000;
    delivery_discount numeric := 0;
    final_delivery_fee numeric := 0;
    has_delivery_items boolean := false;
BEGIN
    -- Calculate cart total and max delivery fee
    SELECT 
        COALESCE(SUM(p.price * ci.quantity), 0),
        COALESCE(MAX(CASE WHEN p.has_delivery THEN p.delivery_price ELSE 0 END), 0),
        EXISTS(SELECT 1 FROM cart_items ci2 JOIN products p2 ON ci2.product_id = p2.id 
               WHERE ci2.customer_id = customer_id_param AND p2.has_delivery = true)
    INTO cart_total, max_delivery_fee, has_delivery_items
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.customer_id = customer_id_param;
    
    -- Calculate delivery fee
    IF has_delivery_items THEN
        IF cart_total >= free_delivery_threshold THEN
            delivery_discount = max_delivery_fee;
            final_delivery_fee = 0;
        ELSE
            final_delivery_fee = max_delivery_fee;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'cart_total', cart_total,
        'original_delivery_fee', max_delivery_fee,
        'delivery_discount', delivery_discount,
        'final_delivery_fee', final_delivery_fee,
        'free_delivery_threshold', free_delivery_threshold,
        'has_delivery_items', has_delivery_items,
        'discount_percentage', CASE 
            WHEN max_delivery_fee > 0 AND delivery_discount > 0 
            THEN ROUND((delivery_discount / max_delivery_fee * 100)::numeric, 0)
            ELSE 0 
        END
    );
END;
$$ LANGUAGE plpgsql;

-- Function to increment product view count
CREATE OR REPLACE FUNCTION increment_product_view(product_id_param uuid)
RETURNS void AS $$
BEGIN
    UPDATE products 
    SET view_count = COALESCE(view_count, 0) + 1,
        updated_at = now()
    WHERE id = product_id_param;
END;
$$ LANGUAGE plpgsql;

-- Add order cancellation function
CREATE OR REPLACE FUNCTION cancel_order(order_id_param uuid, customer_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    order_record record;
BEGIN
    -- Check if order exists and belongs to customer
    SELECT * INTO order_record
    FROM orders 
    WHERE id = order_id_param 
    AND customer_id = customer_id_param 
    AND status IN ('pending', 'confirmed');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Buyurtma topilmadi yoki bekor qilib bo''lmaydi'
        );
    END IF;
    
    -- Update order status
    UPDATE orders 
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = order_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Buyurtma bekor qilindi'
    );
END;
$$ LANGUAGE plpgsql;

-- Add company profile fields
ALTER TABLE company ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE company ADD COLUMN IF NOT EXISTS established_year integer;
ALTER TABLE company ADD COLUMN IF NOT EXISTS employee_count integer;
ALTER TABLE company ADD COLUMN IF NOT EXISTS services text[];

-- Update company with additional info
UPDATE company SET 
    description = 'JamolStroy - Toshkentdagi eng yirik qurilish materiallari do''koni. Biz 2020 yildan beri mijozlarimizga yuqori sifatli mahsulotlar va professional xizmatlarni taqdim etib kelmoqdamiz.',
    established_year = 2020,
    employee_count = 25,
    services = ARRAY['Qurilish materiallari sotish', 'Yetkazib berish xizmati', 'Mutaxassis maslahat', 'Ijara xizmati']
WHERE is_active = true;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON search_queries TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION track_search_query(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_popular_searches(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION calculate_delivery_with_threshold(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_product_view(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_search_suggestions(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION cancel_order(uuid, uuid) TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Search queries are viewable by everyone" ON search_queries FOR SELECT USING (true);
CREATE POLICY "Search queries can be inserted by everyone" ON search_queries FOR INSERT WITH CHECK (true);
CREATE POLICY "Search queries can be updated by everyone" ON search_queries FOR UPDATE USING (true);

ANALYZE;
