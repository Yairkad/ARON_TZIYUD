/**
 * Delete ALL equipment images from Supabase Storage
 * IMPORTANT: Run this ONLY after uploading all images to Google Drive!
 * This script deletes ONLY equipment images, NOT category icons!
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deleteAllEquipmentImages() {
  try {
    console.log('⚠️  WARNING: This will delete ALL equipment images from Supabase Storage!')
    console.log('⚠️  Make sure you have uploaded all images to Google Drive first!\n')

    // List all equipment images
    const { data: files, error: listError } = await supabase
      .storage
      .from('equipment-images')
      .list('equipment', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (listError) {
      console.error('❌ Error listing files:', listError)
      return
    }

    if (!files || files.length === 0) {
      console.log('✅ No equipment images found to delete!')
      return
    }

    console.log(`Found ${files.length} equipment images to delete:\n`)

    // Show what will be deleted
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${(file.metadata.size / 1024).toFixed(2)} KB)`)
    })

    const totalSize = files.reduce((sum, file) => sum + file.metadata.size, 0)
    console.log(`\n📊 Total to delete: ${files.length} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`)

    // Delete all files
    console.log('🗑️  Deleting files from Storage...\n')

    const filePaths = files.map(file => `equipment/${file.name}`)

    const { data, error: deleteError } = await supabase
      .storage
      .from('equipment-images')
      .remove(filePaths)

    if (deleteError) {
      console.error('❌ Error deleting files:', deleteError)
      return
    }

    console.log(`✅ Successfully deleted ${filePaths.length} equipment images from Supabase Storage!`)
    console.log('💾 Saved approximately', (totalSize / 1024 / 1024).toFixed(2), 'MB of storage space\n')

    // Note: We do NOT delete the database URLs - they should now point to Google Drive
    console.log('ℹ️  Note: Equipment records in database still have their image_url fields.')
    console.log('   Make sure to update them with Google Drive URLs using the admin panel.\n')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

deleteAllEquipmentImages()
