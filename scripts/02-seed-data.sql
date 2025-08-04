-- Kompaniya ma'lumotlarini to'ldirish
INSERT INTO company (name, version, logo_url, social_telegram, social_x, social_youtube, social_instagram) VALUES
('JamolStroy', '0.1.0', '/images/logo.png', 'https://t.me/jamolstroy', 'https://x.com/jamolstroy', 'https://youtube.com/@jamolstroy', 'https://instagram.com/jamolstroy');

-- Asosiy kategoriyalarni to'ldirish
INSERT INTO categories (name_uz, name_ru, icon_name, sort_order, is_main) VALUES
('Armatura', 'Арматура', 'construction', 1, true),
('Trubalar', 'Трубы', 'pipe', 2, true),
('Profil', 'Профиль', 'square', 3, true),
('Plastik', 'Пластик', 'layers', 4, true),
('Asboblar', 'Инструменты', 'wrench', 5, true),
('Elektr', 'Электро', 'zap', 6, true);

-- Armatura subkategoriyalari
INSERT INTO categories (name_uz, name_ru, parent_id, icon_name, sort_order) 
SELECT 'Armatura 12mm', 'Арматура 12мм', id, 'minus', 1 FROM categories WHERE name_uz = 'Armatura';

INSERT INTO categories (name_uz, name_ru, parent_id, icon_name, sort_order) 
SELECT 'Armatura 14mm', 'Арматура 14мм', id, 'minus', 2 FROM categories WHERE name_uz = 'Armatura';

INSERT INTO categories (name_uz, name_ru, parent_id, icon_name, sort_order) 
SELECT 'Armatura 16mm', 'Арматура 16мм', id, 'minus', 3 FROM categories WHERE name_uz = 'Armatura';

-- Namunaviy mahsulotlar
INSERT INTO products (name_uz, name_ru, description_uz, description_ru, category_id, price, unit, stock_quantity, delivery_limit, delivery_price, images, is_popular, is_featured) 
SELECT 
    'Armatura 12mm', 
    'Арматура 12мм',
    'Yuqori sifatli armatura, qurilish ishlari uchun',
    'Высококачественная арматура для строительных работ',
    id,
    8500.00,
    'metr',
    1000,
    100000.00,
    15000.00,
    ARRAY['/images/products/armatura-12mm.jpg'],
    true,
    true
FROM categories WHERE name_uz = 'Armatura 12mm';

INSERT INTO products (name_uz, name_ru, description_uz, description_ru, category_id, price, unit, stock_quantity, delivery_limit, delivery_price, images, is_popular, is_featured) 
SELECT 
    'Armatura 14mm', 
    'Арматура 14мм',
    'Mustahkam armatura, katta qurilish loyihalari uchun',
    'Прочная арматура для крупных строительных проектов',
    id,
    11200.00,
    'metr',
    800,
    150000.00,
    20000.00,
    ARRAY['/images/products/armatura-14mm.jpg'],
    true,
    false
FROM categories WHERE name_uz = 'Armatura 14mm';

-- Ko'proq mahsulotlar qo'shish
INSERT INTO products (name_uz, name_ru, description_uz, category_id, price, unit, stock_quantity, delivery_limit, delivery_price, images, is_popular) 
SELECT 
    'Armatura 16mm', 
    'Арматура 16мм',
    'Og''ir qurilish ishlari uchun armatura',
    id,
    14500.00,
    'metr',
    600,
    200000.00,
    25000.00,
    ARRAY['/images/products/armatura-16mm.jpg'],
    true
FROM categories WHERE name_uz = 'Armatura 16mm';

-- Reklama bannerlarini qo'shish
INSERT INTO ads (name, image_url, link, is_active, sort_order) VALUES
('Yangi armatura keldi!', '/images/ads/armatura-banner.jpg', '/catalog?category=armatura', true, 1),
('Chegirmalar', '/images/ads/discount-banner.jpg', '/catalog?discount=true', true, 2);

-- Test foydalanuvchi
INSERT INTO users (telegram_id, phone_number, first_name, last_name, is_verified) VALUES
(123456789, '+998901234567', 'Test', 'Foydalanuvchi', true);
