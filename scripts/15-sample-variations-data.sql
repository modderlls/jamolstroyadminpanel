-- Add sample product variations for testing
UPDATE products SET specifications = jsonb_build_object(
    'color', jsonb_build_array(
        jsonb_build_object('name', 'Oq', 'value', 'white', 'price', 0),
        jsonb_build_object('name', 'Qora', 'value', 'black', 'price', 5000),
        jsonb_build_object('name', 'Kulrang', 'value', 'gray', 'price', 3000)
    ),
    'size', jsonb_build_array(
        jsonb_build_object('name', 'Kichik', 'value', 'small', 'price', 0),
        jsonb_build_object('name', 'O''rta', 'value', 'medium', 'price', 10000),
        jsonb_build_object('name', 'Katta', 'value', 'large', 'price', 20000)
    )
) WHERE id IN (
    SELECT id FROM products 
    WHERE category_id IN (SELECT id FROM categories LIMIT 3)
    LIMIT 5
);

UPDATE products SET specifications = jsonb_build_object(
    'material', jsonb_build_array(
        jsonb_build_object('name', 'Temir', 'value', 'iron', 'price', 0),
        jsonb_build_object('name', 'Alyuminiy', 'value', 'aluminum', 'price', 15000),
        jsonb_build_object('name', 'Plastik', 'value', 'plastic', 'price', -5000)
    ),
    'brand', jsonb_build_array(
        jsonb_build_object('name', 'JamolStroy', 'value', 'jamolstroy', 'price', 0),
        jsonb_build_object('name', 'Premium', 'value', 'premium', 'price', 25000)
    )
) WHERE specifications IS NULL AND id IN (
    SELECT id FROM products 
    WHERE category_id IN (SELECT id FROM categories OFFSET 3 LIMIT 3)
    LIMIT 5
);

-- Ensure all products have proper stock quantities
UPDATE products 
SET stock_quantity = CASE 
    WHEN stock_quantity <= 0 THEN 100
    ELSE stock_quantity
END;

-- Set available quantities (this will be calculated dynamically in the app)
UPDATE products 
SET min_order_quantity = CASE 
    WHEN min_order_quantity <= 0 THEN 1
    ELSE min_order_quantity
END;

-- Update delivery settings
UPDATE products 
SET has_delivery = true,
    delivery_price = 15000,
    delivery_limit = 100000
WHERE has_delivery IS NULL OR delivery_price IS NULL;
