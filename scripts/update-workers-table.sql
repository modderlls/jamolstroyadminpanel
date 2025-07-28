-- Add new columns to workers table for passport information
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS passport_series VARCHAR(10),
ADD COLUMN IF NOT EXISTS passport_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS passport_image TEXT;

-- Add was_qarzdor column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS was_qarzdor BOOLEAN DEFAULT FALSE;

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_type VARCHAR(50) DEFAULT 'cash',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_orders_was_qarzdor ON orders(was_qarzdor);

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policy for payments table
CREATE POLICY "Enable all operations for authenticated users" ON payments
    FOR ALL USING (true);
