import { supabase } from './supabase';

/**
 * Upload a file to Supabase Storage
 * @param file - File to upload
 * @param bucket - Storage bucket name (default: 'documents')
 * @param folder - Optional subfolder path
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  file: File,
  bucket: string = 'documents',
  folder?: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = folder ? `${folder}/${uniqueName}` : uniqueName;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param fileUrl - Full public URL of the file
 * @param bucket - Storage bucket name (default: 'documents')
 */
export async function deleteFile(
  fileUrl: string,
  bucket: string = 'documents'
): Promise<void> {
  const url = new URL(fileUrl);
  const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
  if (pathParts.length < 2) return;

  const filePath = pathParts[1];
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) throw error;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
