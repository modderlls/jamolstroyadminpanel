-- Create reviews table for real customer reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_item_id ON reviews(order_item_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- Insert some sample reviews for existing completed orders
INSERT INTO reviews (order_item_id, product_id, customer_id, rating, comment) 
SELECT 
    oi.id,
    oi.product_id,
    o.customer_id,
    (4 + random())::INTEGER, -- Random rating between 4-5
    CASE 
        WHEN random() < 0.2 THEN 'Juda sifatli mahsulot, tavsiya qilaman!'
        WHEN random() < 0.4 THEN 'Yaxshi sifat, tez yetkazib berishdi.'
        WHEN random() < 0.6 THEN 'Narxi ham mos, sifati ham yaxshi.'
        WHEN random() < 0.8 THEN 'Mukammal xizmat, rahmat!'
        ELSE 'Kutganimdan ham yaxshi chiqdi.'
    END
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.is_claimed = true
AND NOT EXISTS (
    SELECT 1 FROM reviews r WHERE r.order_item_id = oi.id
)
LIMIT 50;
