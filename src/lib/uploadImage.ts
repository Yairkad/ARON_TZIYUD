import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Sanitize filename to be URL-safe
 * Removes Hebrew and special characters, keeps only alphanumeric, dash, underscore, and dot
 */
function sanitizeFilename(filename: string): string {
  return filename
    .normalize('NFD') // Normalize unicode
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s.-]/g, '') // Remove non-alphanumeric except dash, underscore, dot, space
    .replace(/\s+/g, '-') // Replace spaces with dash
    .toLowerCase()
}

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param folder - Optional folder name within the bucket (e.g., 'equipment')
 * @returns The public URL of the uploaded image, or null if upload failed
 */
export async function uploadImage(file: File, folder: string = 'equipment'): Promise<string | null> {
  try {
    const supabase = createClientComponentClient()

    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error('No authenticated user:', sessionError)
      return null
    }

    // Generate a unique filename with timestamp
    const fileExt = file.name.split('.').pop()
    const originalName = file.name.replace(`.${fileExt}`, '')
    const sanitizedName = sanitizeFilename(originalName)

    // Use random string if sanitized name is empty or only contains special chars
    const safeName = sanitizedName && sanitizedName.replace(/[-_.]/g, '').length > 0
      ? sanitizedName
      : Math.random().toString(36).substring(7)

    const fileName = `${folder}/${Date.now()}-${safeName}.${fileExt}`

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

    console.log('✅ Image uploaded successfully:', publicUrl)
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
    const supabase = createClientComponentClient()

    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error('No authenticated user:', sessionError)
      return false
    }

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
