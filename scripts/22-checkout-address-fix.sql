-- Fix checkout page address handling and delivery system
-- Remove postal_code completely and improve delivery logic

-- Remove postal_code from addresses table if it still exists
ALTER TABLE addresses DROP COLUMN IF EXISTS postal_code;

-- Add location tracking columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_location jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_instructions text;

-- Create function to calculate delivery fee based on products
CREATE OR REPLACE FUNCTION calculate_delivery_fee(order_items jsonb)
RETURNS numeric AS $$
DECLARE
    max_delivery_fee numeric := 0;
    item jsonb;
    product_delivery_fee numeric;
BEGIN
    -- Loop through order items to find maximum delivery fee
    FOR item IN SELECT * FROM jsonb_array_elements(order_items)
    LOOP
        SELECT delivery_price INTO product_delivery_fee 
        FROM products 
        WHERE id = (item->>'product_id')::uuid 
        AND has_delivery = true;
        
        IF product_delivery_fee > max_delivery_fee THEN
            max_delivery_fee := product_delivery_fee;
        END IF;
    END LOOP;
    
    RETURN max_delivery_fee;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if order has delivery products
CREATE OR REPLACE FUNCTION has_delivery_products(customer_id_param uuid)
RETURNS boolean AS $$
DECLARE
    has_delivery_items boolean := false;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.customer_id = customer_id_param 
        AND p.has_delivery = true
    ) INTO has_delivery_items;
    
    RETURN has_delivery_items;
END;
$$ LANGUAGE plpgsql;

-- Create function to get delivery summary for customer
CREATE OR REPLACE FUNCTION get_delivery_summary(customer_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    delivery_products jsonb;
    no_delivery_products jsonb;
    max_delivery_fee numeric := 0;
    company_address text;
BEGIN
    -- Get company address
    SELECT address INTO company_address FROM company WHERE is_active = true LIMIT 1;
    
    -- Get products with delivery
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_id', p.id,
            'name', p.name_uz,
            'delivery_price', p.delivery_price,
            'delivery_limit', p.delivery_limit,
            'quantity', ci.quantity
        )
    ) INTO delivery_products
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.customer_id = customer_id_param 
    AND p.has_delivery = true;
    
    -- Get products without delivery
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_id', p.id,
            'name', p.name_uz,
            'quantity', ci.quantity
        )
    ) INTO no_delivery_products
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.customer_id = customer_id_param 
    AND p.has_delivery = false;
    
    -- Calculate max delivery fee
    SELECT MAX(p.delivery_price) INTO max_delivery_fee
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.customer_id = customer_id_param 
    AND p.has_delivery = true;
    
    RETURN jsonb_build_object(
        'has_delivery_products', delivery_products IS NOT NULL,
        'has_no_delivery_products', no_delivery_products IS NOT NULL,
        'delivery_products', COALESCE(delivery_products, '[]'::jsonb),
        'no_delivery_products', COALESCE(no_delivery_products, '[]'::jsonb),
        'max_delivery_fee', COALESCE(max_delivery_fee, 0),
        'company_address', company_address
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to validate order before submission
CREATE OR REPLACE FUNCTION validate_order_submission()
RETURNS TRIGGER AS $$
DECLARE
    has_delivery_items boolean;
    company_addr text;
BEGIN
    -- Check if order has delivery products
    SELECT EXISTS(
        SELECT 1 
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = NEW.id 
        AND p.has_delivery = true
    ) INTO has_delivery_items;
    
    -- If has delivery products and delivery service is selected, address is required
    IF has_delivery_items AND NEW.delivery_with_service = true THEN
        IF NEW.delivery_address IS NULL OR TRIM(NEW.delivery_address) = '' THEN
            RAISE EXCEPTION 'Yetkazib berish xizmati tanlanganda manzil kiritish majburiy';
        END IF;
    END IF;
    
    -- If no delivery service, set generic address
    IF NEW.delivery_with_service = false THEN
        SELECT address INTO company_addr FROM company WHERE is_active = true LIMIT 1;
        NEW.delivery_address = 'Mijoz o''zi olib ketadi: ' || COALESCE(company_addr, 'Kompaniya manzili');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order validation
DROP TRIGGER IF EXISTS validate_order_submission_trigger ON orders;
CREATE TRIGGER validate_order_submission_trigger
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_order_submission();

-- Update existing orders without delivery service
UPDATE orders 
SET delivery_address = 'Mijoz o''zi olib ketadi: ' || (SELECT address FROM company WHERE is_active = true LIMIT 1)
WHERE delivery_with_service = false;

-- Remove rental deposit requirement (set to 0)
UPDATE products SET rental_deposit = 0 WHERE product_type = 'rental';

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_delivery_fee(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION has_delivery_products(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_delivery_summary(uuid) TO anon, authenticated, service_role;

ANALYZE;
