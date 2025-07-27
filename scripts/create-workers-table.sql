-- Create workers table if not exists
CREATE TABLE IF NOT EXISTS public.workers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name character varying(100) NOT NULL,
  last_name character varying(100) NOT NULL,
  profession_uz character varying(200) NOT NULL,
  phone_number character varying(20) NOT NULL,
  experience_years integer NOT NULL DEFAULT 0,
  hourly_rate integer NOT NULL DEFAULT 0,
  daily_rate integer NOT NULL DEFAULT 0,
  rating numeric(3,2) NOT NULL DEFAULT 0.0,
  is_available boolean NOT NULL DEFAULT true,
  location character varying(200) NULL,
  description_uz text NULL,
  skills text[] NULL DEFAULT '{}',
  portfolio_images text[] NULL DEFAULT '{}',
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT workers_pkey PRIMARY KEY (id),
  CONSTRAINT workers_rating_check CHECK (rating >= 0 AND rating <= 5)
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workers_profession 
ON public.workers USING btree (profession_uz) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_available 
ON public.workers USING btree (is_available) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_location 
ON public.workers USING btree (location) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_rating 
ON public.workers USING btree (rating DESC) 
TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE TRIGGER update_workers_updated_at 
BEFORE UPDATE ON workers 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON public.workers
FOR ALL USING (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE public.workers IS 'Qurilish ustalari jadvali';
COMMENT ON COLUMN public.workers.profession_uz IS 'Kasb nomi o\'zbek tilida';
COMMENT ON COLUMN public.workers.experience_years IS 'Tajriba yillari soni';
COMMENT ON COLUMN public.workers.hourly_rate IS 'Soatlik ish haqi (so\'m)';
COMMENT ON COLUMN public.workers.daily_rate IS 'Kunlik ish haqi (so\'m)';
COMMENT ON COLUMN public.workers.rating IS 'Reyting (0-5)';
COMMENT ON COLUMN public.workers.skills IS 'Ko\'nikmalar ro\'yxati';
COMMENT ON COLUMN public.workers.portfolio_images IS 'Portfolio rasmlari URL manzillari';
