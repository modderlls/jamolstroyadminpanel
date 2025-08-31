-- Add column to track SMS notifications for orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS sms_notification_sent BOOLEAN DEFAULT FALSE;

-- Update existing orders to have notification sent as true (to avoid spam)
UPDATE orders 
SET sms_notification_sent = TRUE 
WHERE sms_notification_sent IS NULL;
