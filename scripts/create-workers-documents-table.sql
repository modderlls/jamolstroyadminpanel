-- Create workers_documents table
CREATE TABLE IF NOT EXISTS public.workers_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  document_type character varying(50) NOT NULL,
  document_number character varying(100) NOT NULL,
  issue_date date NOT NULL,
  expiry_date date NULL,
  issued_by text NOT NULL,
  document_images text[] NULL DEFAULT '{}',
  is_verified boolean NULL DEFAULT false,
  verified_by uuid NULL,
  verified_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT workers_documents_pkey PRIMARY KEY (id),
  CONSTRAINT workers_documents_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workers_documents_worker_id 
ON public.workers_documents USING btree (worker_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_documents_type 
ON public.workers_documents USING btree (document_type) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workers_documents_verified 
ON public.workers_documents USING btree (is_verified) 
TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE TRIGGER update_workers_documents_updated_at 
BEFORE UPDATE ON workers_documents 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.workers_documents ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON public.workers_documents
FOR ALL USING (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE public.workers_documents IS 'Ustalar hujjatlari jadvali';
COMMENT ON COLUMN public.workers_documents.document_type IS 'Hujjat turi (passport, license, certificate)';
COMMENT ON COLUMN public.workers_documents.document_number IS 'Hujjat raqami';
COMMENT ON COLUMN public.workers_documents.issue_date IS 'Berilgan sana';
COMMENT ON COLUMN public.workers_documents.expiry_date IS 'Amal qilish muddati';
COMMENT ON COLUMN public.workers_documents.issued_by IS 'Kim tomonidan berilgan';
COMMENT ON COLUMN public.workers_documents.document_images IS 'Hujjat rasmlari URL manzillari';
COMMENT ON COLUMN public.workers_documents.is_verified IS 'Tasdiqlangan holati';
