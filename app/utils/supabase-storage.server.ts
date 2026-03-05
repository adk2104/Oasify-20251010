import { createClient } from '@supabase/supabase-js';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Download an Instagram thumbnail and upload it to Supabase Storage.
 * Returns the permanent public URL, or throws on failure (caller falls back to CDN URL).
 */
export async function persistInstagramThumbnail({
  sourceUrl,
  mediaId,
}: {
  sourceUrl: string;
  mediaId: string;
}): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  // SSRF protection
  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== 'https:') {
    throw new Error(`Refusing non-HTTPS URL: ${sourceUrl}`);
  }

  // Download
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download thumbnail: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Unexpected content-type: ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    throw new Error(`Thumbnail too large: ${buffer.byteLength} bytes`);
  }

  // Determine extension
  const baseType = contentType.split(';')[0].trim();
  const ext = EXT_MAP[baseType] || 'jpg';
  const path = `instagram/${mediaId}.${ext}`;

  // Upload to Supabase Storage
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase.storage
    .from('thumbnails')
    .upload(path, buffer, { upsert: true, contentType: baseType });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from('thumbnails').getPublicUrl(path);
  return data.publicUrl;
}
