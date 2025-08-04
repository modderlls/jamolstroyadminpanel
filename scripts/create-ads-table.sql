-- Create ads table
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(255) NOT NULL,
  image_url text NOT NULL,
  link text NULL,
  is_active boolean NULL DEFAULT true,
  click_count integer NULL DEFAULT 0,
  sort_order integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT ads_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create index for active ads
CREATE INDEX IF NOT EXISTS idx_ads_active 
ON public.ads USING btree (is_active) 
TABLESPACE pg_default;

-- Create index for sort order
CREATE INDEX IF NOT EXISTS idx_ads_sort_order 
ON public.ads USING btree (sort_order) 
TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ads_updated_at 
BEFORE UPDATE ON ads 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON public.ads
FOR ALL USING (auth.role() = 'authenticated');
