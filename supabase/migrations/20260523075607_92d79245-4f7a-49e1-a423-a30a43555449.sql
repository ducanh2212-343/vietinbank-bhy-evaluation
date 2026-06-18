DROP POLICY IF EXISTS "Anyone can view skill images" ON storage.objects;

CREATE POLICY "Authenticated can view skill images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'skill-images');