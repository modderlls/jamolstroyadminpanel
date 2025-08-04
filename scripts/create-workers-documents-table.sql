-- Create workers_documents table for storing worker documents
CREATE TABLE IF NOT EXISTS workers_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'passport', 'license', 'certificate', 'contract', 'other'
  document_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workers_documents_worker_id ON workers_documents(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_documents_type ON workers_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_workers_documents_verified ON workers_documents(is_verified);
CREATE INDEX IF NOT EXISTS idx_workers_documents_created_at ON workers_documents(created_at);

-- Enable RLS
ALTER TABLE workers_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users" ON workers_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON workers_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON workers_documents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON workers_documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_workers_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workers_documents_updated_at
  BEFORE UPDATE ON workers_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_workers_documents_updated_at();

-- Insert sample document types for reference
INSERT INTO workers_documents (worker_id, document_type, document_name, file_url, notes)
SELECT 
  w.id,
  'passport',
  'Passport Copy',
  '/placeholder-document.pdf',
  'Sample passport document'
FROM workers w
LIMIT 1
ON CONFLICT DO NOTHING;

COMMENT ON TABLE workers_documents IS 'Stores documents related to workers (passports, licenses, certificates, etc.)';
COMMENT ON COLUMN workers_documents.document_type IS 'Type of document: passport, license, certificate, contract, other';
COMMENT ON COLUMN workers_documents.is_verified IS 'Whether the document has been verified by admin';
COMMENT ON COLUMN workers_documents.verified_by IS 'Admin user who verified the document';
