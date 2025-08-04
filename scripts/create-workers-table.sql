-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  profession_uz VARCHAR(200) NOT NULL,
  profession_ru VARCHAR(200),
  profession_en VARCHAR(200),
  phone_number VARCHAR(20),
  experience_years INTEGER DEFAULT 0,
  hourly_rate INTEGER DEFAULT 0,
  daily_rate INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  is_available BOOLEAN DEFAULT true,
  location TEXT,
  description_uz TEXT,
  description_ru TEXT,
  description_en TEXT,
  skills TEXT[], -- Array of skills
  portfolio_images TEXT[], -- Array of image URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workers_profession_uz ON workers(profession_uz);
CREATE INDEX IF NOT EXISTS idx_workers_is_available ON workers(is_available);
CREATE INDEX IF NOT EXISTS idx_workers_rating ON workers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_workers_experience ON workers(experience_years DESC);
CREATE INDEX IF NOT EXISTS idx_workers_location ON workers(location);
CREATE INDEX IF NOT EXISTS idx_workers_created_at ON workers(created_at DESC);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_workers_search ON workers USING gin(
  to_tsvector('simple', 
    coalesce(first_name, '') || ' ' || 
    coalesce(last_name, '') || ' ' || 
    coalesce(profession_uz, '') || ' ' || 
    coalesce(profession_ru, '') || ' ' || 
    coalesce(location, '')
  )
);

-- Enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users" ON workers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON workers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON workers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON workers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_workers_updated_at();

-- Insert sample workers
INSERT INTO workers (
  first_name, 
  last_name, 
  profession_uz, 
  profession_ru, 
  profession_en,
  phone_number,
  experience_years,
  hourly_rate,
  daily_rate,
  rating,
  is_available,
  location,
  description_uz,
  description_ru,
  skills,
  portfolio_images
) VALUES 
(
  'Akmal', 
  'Karimov', 
  'Qurilish ustasi', 
  'Строитель', 
  'Builder',
  '+998901234567',
  5,
  50000,
  400000,
  4.5,
  true,
  'Toshkent, Chilonzor tumani',
  'Tajribali qurilish ustasi. Uy qurilishi va ta''mirlash ishlarini bajaradi.',
  'Опытный строитель. Выполняет строительство и ремонт домов.',
  ARRAY['Qurilish', 'Ta''mirlash', 'Beton ishlari', 'G''isht terish'],
  ARRAY['/placeholder-portfolio1.jpg', '/placeholder-portfolio2.jpg']
),
(
  'Sardor', 
  'Toshmatov', 
  'Elektrik', 
  'Электрик', 
  'Electrician',
  '+998901234568',
  3,
  40000,
  320000,
  4.2,
  true,
  'Toshkent, Yunusobod tumani',
  'Elektr montaj va ta''mirlash ishlarini bajaruvchi mutaxassis.',
  'Специалист по электромонтажу и ремонту.',
  ARRAY['Elektr montaj', 'Kabel o''tkazish', 'Rozetka o''rnatish', 'Elektr ta''mirlash'],
  ARRAY['/placeholder-portfolio3.jpg']
),
(
  'Bobur', 
  'Rahimov', 
  'Santexnik', 
  'Сантехник', 
  'Plumber',
  '+998901234569',
  7,
  45000,
  360000,
  4.8,
  false,
  'Toshkent, Mirzo Ulug''bek tumani',
  'Suv va kanalizatsiya tizimlarini o''rnatish va ta''mirlash bo''yicha mutaxassis.',
  'Специалист по установке и ремонту водопроводных и канализационных систем.',
  ARRAY['Suv tizimi', 'Kanalizatsiya', 'Quvur o''rnatish', 'Santexnika ta''mirlash'],
  ARRAY['/placeholder-portfolio4.jpg', '/placeholder-portfolio5.jpg', '/placeholder-portfolio6.jpg']
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE workers IS 'Stores information about construction workers and specialists';
COMMENT ON COLUMN workers.skills IS 'Array of worker skills and specializations';
COMMENT ON COLUMN workers.portfolio_images IS 'Array of URLs to portfolio images';
COMMENT ON COLUMN workers.rating IS 'Worker rating from 0.0 to 5.0';
