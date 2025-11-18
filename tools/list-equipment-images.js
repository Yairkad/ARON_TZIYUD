/**
 * List all equipment images in Supabase Storage
 * This helps identify which images to delete after migrating to Google Drive links
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.log('Please set:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listEquipmentImages() {
  try {
    console.log('📋 Listing equipment images in Supabase Storage...\n')

    // List all files in equipment-images bucket
    const { data: files, error } = await supabase
      .storage
      .from('equipment-images')
      .list('equipment', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('❌ Error listing files:', error)
      return
    }

    if (!files || files.length === 0) {
      console.log('✅ No equipment images found in storage!')
      return
    }

    console.log(`Found ${files.length} equipment images:\n`)

    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`)
      console.log(`   Size: ${(file.metadata.size / 1024).toFixed(2)} KB`)
      console.log(`   Updated: ${new Date(file.updated_at).toLocaleString('he-IL')}`)
      console.log('')
    })

    const totalSize = files.reduce((sum, file) => sum + file.metadata.size, 0)
    console.log(`📊 Total: ${files.length} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB`)

    // Also check which equipment in DB still uses Supabase storage URLs
    console.log('\n🔍 Checking equipment table for Supabase image URLs...\n')

    const { data: equipment, error: dbError } = await supabase
      .from('equipment')
      .select('id, name, image_url, city_id')
      .not('image_url', 'is', null)
      .like('image_url', '%supabase.co%')

    if (dbError) {
      console.error('❌ Error querying equipment:', dbError)
      return
    }

    if (equipment && equipment.length > 0) {
      console.log(`Found ${equipment.length} equipment items with Supabase URLs:`)
      equipment.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} (City ID: ${item.city_id})`)
        console.log(`   URL: ${item.image_url}`)
        console.log('')
      })
    } else {
      console.log('✅ No equipment using Supabase storage URLs!')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

listEquipmentImages()
