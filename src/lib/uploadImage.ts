/**
 * Upload an image file to Supabase Storage via API route
 * @param file - The image file to upload
 * @param folder - Optional folder name within the bucket (e.g., 'equipment')
 * @returns The public URL of the uploaded image, or null if upload failed
 */
export async function uploadImage(file: File, folder: string = 'equipment'): Promise<string | null> {
  try {
    // Create FormData to send file to API
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    // Call API route which handles authentication and upload with service role
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error uploading image:', error)
      return null
    }

    const { url } = await response.json()
    console.log('✅ Image uploaded successfully:', url)
    return url
  } catch (error) {
    console.error('Error in uploadImage:', error)
    return null
  }
}

/**
 * Delete an image from Supabase Storage via API route
 * @param imageUrl - The full public URL of the image
 * @returns True if deletion was successful, false otherwise
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    // Call API route which handles authentication and deletion with service role
    const response = await fetch('/api/delete-image', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageUrl })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error deleting image:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteImage:', error)
    return false
  }
}
