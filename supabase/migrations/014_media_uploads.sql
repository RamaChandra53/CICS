-- Media support for direct messages.
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload message images" ON storage.objects;
CREATE POLICY "Authenticated users can upload message images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Message images are publicly readable" ON storage.objects;
CREATE POLICY "Message images are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'message-images');
