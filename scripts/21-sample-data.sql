-- Sample data for JamolStroy database
-- Insert sample data for testing

-- Insert company info
INSERT INTO company (name, version, logo_url, phone_number, location, time, address, social_telegram, social_instagram, is_active) 
VALUES (
    'JamolStroy', 
    '1.0.0', 
    '/placeholder-logo.png',
    '+998 90 123 45 67',
    'Toshkent shahar, Chilonzor tumani',
    'Dushanba-Shanba: 9:00-18:00',
    'Toshkent shahar, Chilonzor tumani, Bunyodkor shoh ko''chasi 12-uy',
    '@jamolstroy',
    '@jamolstroy_uz',
    true
) ON CONFLICT (version) DO UPDATE SET
    name = EXCLUDED.name,
    phone_number = EXCLUDED.phone_number,
    location = EXCLUDED.location,
    time = EXCLUDED.time,
    address = EXCLUDED.address,
    social_telegram = EXCLUDED.social_telegram,
    social_instagram = EXCLUDED.social_instagram;

-- Insert sample categories
INSERT INTO categories (id, name_uz, description_uz, icon_name, is_active, is_main, sort_order) VALUES
(gen_random_uuid(), 'Qurilish materiallari', 'Har xil qurilish materiallari', 'building', true, true, 1),
(gen_random_uuid(), 'Elektr jihozlari', 'Elektr asbob-uskunalari', 'zap', true, true, 2),
(gen_random_uuid(), 'Santexnika', 'Suv va kanalizatsiya tizimlari', 'droplets', true, true, 3),
(gen_random_uuid(), 'Bo''yoq va laklar', 'Turli xil bo''yoq materiallari', 'palette', true, true, 4),
(gen_random_uuid(), 'Asboblar', 'Qurilish asboblari', 'wrench', true, true, 5)
ON CONFLICT DO NOTHING;

-- Get category IDs for products
DO $$
DECLARE
    cat_qurilish uuid;
    cat_elektr uuid;
    cat_santexnika uuid;
    cat_boyoq uuid;
    cat_asboblar uuid;
BEGIN
    SELECT id INTO cat_qurilish FROM categories WHERE name_uz = 'Qurilish materiallari' LIMIT 1;
    SELECT id INTO cat_elektr FROM categories WHERE name_uz = 'Elektr jihozlari' LIMIT 1;
    SELECT id INTO cat_santexnika FROM categories WHERE name_uz = 'Santexnika' LIMIT 1;
    SELECT id INTO cat_boyoq FROM categories WHERE name_uz = 'Bo''yoq va laklar' LIMIT 1;
    SELECT id INTO cat_asboblar FROM categories WHERE name_uz = 'Asboblar' LIMIT 1;

    -- Insert sample products
    INSERT INTO products (name_uz, description_uz, category_id, price, unit, stock_quantity, min_order_quantity, delivery_price, delivery_limit, has_delivery, is_available, is_featured, product_type) VALUES
    ('Sement M400', 'Yuqori sifatli sement', cat_qurilish, 45000, 'qop', 100, 1, 15000, 200000, true, true, true, 'sale'),
    ('G''isht qizil', 'Qurilish g''ishti', cat_qurilish, 800, 'dona', 5000, 100, 25000, 500000, true, true, false, 'sale'),
    ('Elektr kabeli', '2.5mm elektr kabeli', cat_elektr, 12000, 'metr', 500, 10, 10000, 150000, true, true, false, 'sale'),
    ('Rozetka', 'Evropa standartidagi rozetka', cat_elektr, 25000, 'dona', 200, 1, 8000, 100000, true, true, false, 'sale'),
    ('Kran', 'Vannaxona kranlari', cat_santexnika, 85000, 'dona', 50, 1, 12000, 300000, true, true, true, 'sale'),
    ('Bo''yoq oq', 'Devor bo''yog''i oq rang', cat_boyoq, 65000, 'litr', 80, 1, 18000, 250000, true, true, false, 'sale'),
    ('Drill', 'Elektr dreli', cat_asboblar, 450000, 'dona', 20, 1, 0, 0, false, true, true, 'sale'),
    ('Perforator ijara', 'Kuchli perforator ijaraga', cat_asboblar, 25000, 'dona', 5, 1, 20000, 0, true, true, true, 'rental');

    -- Update rental product
    UPDATE products SET 
        rental_time_unit = 'day',
        rental_price_per_unit = 25000,
        rental_min_duration = 1,
        rental_max_duration = 30
    WHERE name_uz = 'Perforator ijara';

END $$;

-- Insert sample users
INSERT INTO users (telegram_id, phone_number, first_name, last_name, username, is_verified, role) VALUES
(123456789, '+998901234567', 'Jamol', 'Karimov', 'jamol_k', true, 'customer'),
(987654321, '+998909876543', 'Aziza', 'Toshmatova', 'aziza_t', true, 'customer'),
(555666777, '+998905556677', 'Bobur', 'Usmonov', 'bobur_builder', true, 'worker'),
(444555666, '+998904445566', 'Dilshod', 'Rahimov', 'dilshod_electric', true, 'worker')
ON CONFLICT (telegram_id) DO NOTHING;

-- Insert worker profiles
DO $$
DECLARE
    worker1_id uuid;
    worker2_id uuid;
BEGIN
    SELECT id INTO worker1_id FROM users WHERE telegram_id = 555666777 LIMIT 1;
    SELECT id INTO worker2_id FROM users WHERE telegram_id = 444555666 LIMIT 1;

    IF worker1_id IS NOT NULL THEN
        INSERT INTO worker_profiles (user_id, profession_uz, experience_years, hourly_rate, daily_rate, skills, location_uz, is_available, rating, total_reviews) VALUES
        (worker1_id, 'Qurilishchi', 8, 35000, 250000, ARRAY['Devor qurish', 'Plitkachi', 'Uy ta''miri'], 'Toshkent, Chilonzor', true, 4.8, 25)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    IF worker2_id IS NOT NULL THEN
        INSERT INTO worker_profiles (user_id, profession_uz, experience_years, hourly_rate, daily_rate, skills, location_uz, is_available, rating, total_reviews) VALUES
        (worker2_id, 'Elektrchi', 5, 40000, 300000, ARRAY['Elektr montaj', 'Rozetka o''rnatish', 'Elektr ta''miri'], 'Toshkent, Yunusobod', true, 4.9, 18)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- Insert sample addresses
DO $$
DECLARE
    user1_id uuid;
    user2_id uuid;
BEGIN
    SELECT id INTO user1_id FROM users WHERE telegram_id = 123456789 LIMIT 1;
    SELECT id INTO user2_id FROM users WHERE telegram_id = 987654321 LIMIT 1;

    IF user1_id IS NOT NULL THEN
        INSERT INTO addresses (user_id, name, address, is_default) VALUES
        (user1_id, 'Uy', 'Toshkent sh., Mirzo Ulug''bek t., Qo''yliq MFY, 15-uy', true),
        (user1_id, 'Ish', 'Toshkent sh., Shayxontohur t., Bobur ko''chasi 25-uy', false)
        ON CONFLICT DO NOTHING;
    END IF;

    IF user2_id IS NOT NULL THEN
        INSERT INTO addresses (user_id, name, address, is_default) VALUES
        (user2_id, 'Uy', 'Toshkent sh., Yashnobod t., Bog''ishamol MFY, 8-uy', true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Insert sample ads
INSERT INTO ads (name, image_url, link, is_active, sort_order) VALUES
('Yangi mahsulotlar', '/placeholder.jpg', '/catalog', true, 1),
('Chegirmalar', '/placeholder.jpg', '/catalog?discount=true', true, 2),
('Ijara xizmati', '/placeholder.jpg', '/catalog?type=rental', true, 3)
ON CONFLICT DO NOTHING;

ANALYZE;
