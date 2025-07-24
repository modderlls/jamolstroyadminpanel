-- Products jadvalini yangilash
ALTER TABLE products DROP COLUMN IF EXISTS is_rental;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'sale' CHECK (product_type IN ('sale', 'rental'));

-- Categories jadvalini yangilash (hierarchical)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS path TEXT;

-- Orders jadvalini yangilash
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_borrowed BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS borrowed_period INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS borrowed_additional_period INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS borrowed_updated_at TIMESTAMP WITH TIME ZONE;

-- MD Password jadvali
CREATE TABLE IF NOT EXISTS md_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- RLS policies
ALTER TABLE md_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage MD passwords" ON md_passwords
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Categories uchun recursive function
CREATE OR REPLACE FUNCTION update_category_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.level = 0;
    NEW.path = NEW.id::text;
  ELSE
    SELECT level + 1, path || '/' || NEW.id::text
    INTO NEW.level, NEW.path
    FROM categories
    WHERE id = NEW.parent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_path_trigger
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_category_path();
