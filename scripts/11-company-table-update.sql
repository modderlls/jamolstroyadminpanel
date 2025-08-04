-- Create company table with proper structure
CREATE TABLE IF NOT EXISTS public.company (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(255) NOT NULL,
  version character varying(20) NOT NULL,
  logo_url text NULL,
  social_telegram text NULL,
  social_x text NULL,
  social_youtube text NULL,
  social_instagram text NULL,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  phone_number text NULL,
  location text NULL,
  time text NULL,
  CONSTRAINT company_pkey PRIMARY KEY (id),
  CONSTRAINT company_version_key UNIQUE (version)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_company_version ON public.company USING btree (version);

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_company_updated_at ON company;
CREATE TRIGGER update_company_updated_at 
    BEFORE UPDATE ON company 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default company data
INSERT INTO public.company (name, version, logo_url, phone_number, location, time, social_telegram, social_instagram, is_active)
VALUES (
    'JamolStroy',
    '1.0.0',
    '/placeholder-logo.png',
    '+998 90 123 45 67',
    'Toshkent sh., Chilonzor t.',
    'Dush-Shan: 9:00-18:00',
    '@jamolstroy_uz',
    '@jamolstroy_uz',
    true
) ON CONFLICT (version) DO UPDATE SET
    name = EXCLUDED.name,
    logo_url = EXCLUDED.logo_url,
    phone_number = EXCLUDED.phone_number,
    location = EXCLUDED.location,
    time = EXCLUDED.time,
    social_telegram = EXCLUDED.social_telegram,
    social_instagram = EXCLUDED.social_instagram,
    updated_at = NOW();
