
-- Create storage bucket for user uploaded images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-images', 'user-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Allow anyone to upload (we'll add auth later)
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'user-images');
CREATE POLICY "Allow public reads" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'user-images');
