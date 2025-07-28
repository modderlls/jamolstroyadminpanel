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
CREATE INDEX IF NOT EXISTS idx_workers_documents_worker_id 
ON public.workers_documents USING btree (worker_id) TABLESPACE pg_default;

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

-- Create storage bucket for documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for documents bucket
CREATE POLICY "Allow public read access on documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to update documents" ON storage.objects
FOR UPDATE USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to delete documents" ON storage.objects
FOR DELETE USING (bucket_id = 'documents');
