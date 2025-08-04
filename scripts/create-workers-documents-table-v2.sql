-- Create workers_documents table
CREATE TABLE IF NOT EXISTS public.workers_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  passport_series text NULL,
  passport_number text NULL,
  birth_date date NULL,
  passport_image_url text NULL,
  additional_documents jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT workers_documents_pkey PRIMARY KEY (id),
  CONSTRAINT workers_documents_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES workers (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index
CREATE INDEX IF NOT EXISTS idx_workers_documents_worker_id ON public.workers_documents USING btree (worker_id) TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workers_documents_updated_at 
BEFORE UPDATE ON workers_documents 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create documents bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for documents bucket - only admin users can access
CREATE POLICY "Only admin users can view documents" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "Only admin users can upload documents" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "Only admin users can update documents" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "Only admin users can delete documents" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
