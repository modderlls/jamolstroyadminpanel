-- Products bucket uchun RLS policy
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);

-- Products bucket uchun policy
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'products' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update product images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'products' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete product images" ON storage.objects FOR DELETE USING (
  bucket_id = 'products' AND 
  auth.role() = 'authenticated'
);
