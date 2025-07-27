-- Create workers_documents table for storing passport and other documents
CREATE TABLE IF NOT EXISTS public.workers_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  passport_series character varying(10),
  passport_number character varying(20),
  passport_image_url text,
  document_type character varying(50) DEFAULT 'passport',
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT workers_documents_pkey PRIMARY KEY (id),
  CONSTRAINT workers_documents_worker_id_fkey FOREIGN KEY (worker_id) 
    REFERENCES public.workers(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index for worker_id
CREATE INDEX IF NOT EXISTS idx_workers_documents_worker_id 
ON public.workers_documents USING btree (worker_id) 
TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE TRIGGER update_workers_documents_updated_at 
BEFORE UPDATE ON workers_documents 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for workers_documents table
ALTER TABLE public.workers_documents ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read documents
CREATE POLICY "Allow authenticated users to read workers documents" ON public.workers_documents
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert documents
CREATE POLICY "Allow authenticated users to insert workers documents" ON public.workers_documents
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update documents
CREATE POLICY "Allow authenticated users to update workers documents" ON public.workers_documents
FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for authenticated users to delete documents
CREATE POLICY "Allow authenticated users to delete workers documents" ON public.workers_documents
FOR DELETE USING (auth.role() = 'authenticated');
