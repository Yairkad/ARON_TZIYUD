import { supabase } from '@/lib/supabase'

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param folder - Optional folder name within the bucket (e.g., 'equipment')
 * @returns The public URL of the uploaded image, or null if upload failed
 */
export async function uploadImage(file: File, folder: string = 'equipment'): Promise<string | null> {
  try {

    // Generate a unique filename with timestamp
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload the file to the 'equipment-images' bucket
    const { data, error } = await supabase.storage
      .from('equipment-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading image:', error)
      return null
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-images')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error('Error in uploadImage:', error)
    return null
  }
}

/**
 * Delete an image from Supabase Storage given its URL
 * @param imageUrl - The full public URL of the image
 * @returns True if deletion was successful, false otherwise
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {

    // Extract the file path from the URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/equipment-images/[path]
    const urlParts = imageUrl.split('/equipment-images/')
    if (urlParts.length !== 2) {
      console.error('Invalid image URL format')
      return false
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('equipment-images')
      .remove([filePath])

    if (error) {
      console.error('Error deleting image:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteImage:', error)
    return false
  }
}
