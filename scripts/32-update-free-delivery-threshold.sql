-- Update free delivery threshold to 750,000 som

-- Update company table if free_delivery_threshold exists there
UPDATE company 
SET free_delivery_threshold = 750000.00
WHERE is_active = true;

-- Update company table if delivery_price exists there
UPDATE company 
SET delivery_price = 5000.00
WHERE is_active = true;

-- If there's a separate settings table, update it there too
-- (This is a common pattern for app settings)
DO $$
BEGIN
    -- Check if settings table exists and has free_delivery_threshold column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'settings'
    ) AND EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'settings' 
        AND column_name = 'free_delivery_threshold'
    ) THEN
        UPDATE settings 
        SET free_delivery_threshold = 750000.00
        WHERE key = 'free_delivery_threshold' OR setting_key = 'free_delivery_threshold';
    END IF;
END $$;

-- If free_delivery_threshold doesn't exist in company table, add it
DO $$
BEGIN
    -- Check if column exists in company table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'company' 
        AND column_name = 'free_delivery_threshold'
    ) THEN
        -- Add the column
        ALTER TABLE company 
        ADD COLUMN free_delivery_threshold DECIMAL(12,2) DEFAULT 750000.00;
        
        -- Update existing records
        UPDATE company 
        SET free_delivery_threshold = 750000.00
        WHERE is_active = true;
    END IF;
END $$;

-- If delivery_price doesn't exist in company table, add it
DO $$
BEGIN
    -- Check if column exists in company table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'company' 
        AND column_name = 'delivery_price'
    ) THEN
        -- Add the column
        ALTER TABLE company 
        ADD COLUMN delivery_price DECIMAL(12,2) DEFAULT 5000.00;
        
        -- Update existing records
        UPDATE company 
        SET delivery_price = 5000.00
        WHERE is_active = true;
    END IF;
END $$;

-- Update any existing delivery calculation functions to use the new threshold
-- This ensures the RPC functions use the correct threshold

-- If there are any hardcoded values in functions, we need to update them
-- Let's check and update the calculate_delivery_with_threshold function

CREATE OR REPLACE FUNCTION calculate_delivery_with_threshold(customer_id_param UUID)
RETURNS JSON AS $$
DECLARE
    cart_total_amount DECIMAL(12,2) := 0;
    fixed_delivery_fee DECIMAL(12,2) := 5000; -- Fixed delivery price
    free_delivery_threshold DECIMAL(12,2) := 750000; -- Free delivery threshold
    has_delivery_items BOOLEAN := false;
    delivery_discount DECIMAL(12,2) := 0;
    final_delivery_fee DECIMAL(12,2) := 0;
    discount_percentage INTEGER := 0;
    result JSON;
BEGIN
    -- Savatdagi umumiy summa va yetkazib berish mavjudligini tekshirish
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN p.product_type = 'rental' AND ci.rental_duration IS NOT NULL 
                THEN p.price * ci.rental_duration * ci.quantity
                ELSE p.price * ci.quantity
            END
        ), 0),
        BOOL_OR(p.has_delivery)
    INTO cart_total_amount, has_delivery_items
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.customer_id = customer_id_param;

    -- Agar yetkazib berish mavjud mahsulotlar bo'lsa
    IF has_delivery_items THEN
        -- Agar cart total free delivery threshold dan katta yoki teng bo'lsa
        IF cart_total_amount >= free_delivery_threshold THEN
            delivery_discount := fixed_delivery_fee;
            final_delivery_fee := 0;
            discount_percentage := 100;
        ELSE
            final_delivery_fee := fixed_delivery_fee;
        END IF;
    END IF;

    -- Natijani JSON formatida qaytarish
    result := json_build_object(
        'cart_total', cart_total_amount,
        'original_delivery_fee', fixed_delivery_fee,
        'delivery_discount', delivery_discount,
        'final_delivery_fee', final_delivery_fee,
        'free_delivery_threshold', free_delivery_threshold,
        'has_delivery_items', has_delivery_items,
        'discount_percentage', discount_percentage
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_delivery_with_threshold(UUID) TO authenticated;

-- Also update any other delivery-related functions that might have hardcoded thresholds
-- Let's make sure all functions are consistent

CREATE OR REPLACE FUNCTION get_delivery_summary(customer_id_param UUID)
RETURNS JSON AS $$
DECLARE
    delivery_products JSON;
    no_delivery_products JSON;
    has_delivery_products BOOLEAN := false;
    has_no_delivery_products BOOLEAN := false;
    fixed_delivery_fee DECIMAL(12,2) := 5000; -- Fixed delivery price
    company_address_text TEXT;
    result JSON;
BEGIN
    -- Company address ni olish
    SELECT address INTO company_address_text
    FROM company 
    WHERE is_active = true 
    LIMIT 1;

    -- Yetkazib berish mavjud mahsulotlar
    SELECT 
        json_agg(
            json_build_object(
                'product_name', p.name_uz,
                'quantity', ci.quantity,
                'delivery_price', fixed_delivery_fee
            )
        ),
        COUNT(*) > 0
    INTO delivery_products, has_delivery_products
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.customer_id = customer_id_param 
    AND p.has_delivery = true;

    -- Yetkazib berish mavjud bo'lmagan mahsulotlar
    SELECT 
        json_agg(
            json_build_object(
                'product_name', p.name_uz,
                'quantity', ci.quantity
            )
        ),
        COUNT(*) > 0
    INTO no_delivery_products, has_no_delivery_products
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.customer_id = customer_id_param 
    AND p.has_delivery = false;

    -- Natijani JSON formatida qaytarish
    result := json_build_object(
        'has_delivery_products', has_delivery_products,
        'has_no_delivery_products', has_no_delivery_products,
        'delivery_products', COALESCE(delivery_products, '[]'::json),
        'no_delivery_products', COALESCE(no_delivery_products, '[]'::json),
        'max_delivery_fee', fixed_delivery_fee,
        'company_address', COALESCE(company_address_text, 'Kompaniya manzili')
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_delivery_summary(UUID) TO authenticated;

-- Barcha mahsulotlarning delivery_price ni fixed qiymatga o'rnatish (ixtiyoriy)
UPDATE products 
SET delivery_price = 5000.00 
WHERE has_delivery = true;

-- Log the change
INSERT INTO public.schema_migrations (version, description, executed_at)
VALUES ('32', 'Update free delivery threshold to 750,000 som and fixed delivery price to 5000 som', NOW())
ON CONFLICT (version) DO UPDATE SET 
    description = EXCLUDED.description,
    executed_at = EXCLUDED.executed_at;

-- Commit changes
COMMIT;
