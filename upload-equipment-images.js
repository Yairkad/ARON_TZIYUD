const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapping Hebrew filenames to English names
const fileNameMapping = {
  'ג\'ק מספריים ראצ\'ט.jpg': 'jack-scissors-ratchet.jpg',
  'ג\'ק בקבוק.png': 'jack-bottle.png',
  'ג\'ק עגלה.png': 'jack-cart.png',
  'מפתח ונטיל.jpg': 'valve-wrench.jpg',
  'מפתח צלב.png': 'cross-wrench.png',
  'מתאם טסלה.png': 'tesla-adapter.png',
  'ספריי פנצ\'ר.jpg': 'tire-spray.jpg',
  'קומפרסור.png': 'compressor.png',
  'ספריי שמן.jpg': 'oil-spray.jpg',
  'תולעים.jpg': 'worms.jpg',
  'ספריי קרבורטור.png': 'carburetor-spray.png',
  'etsba.png': 'etsba.png',
  'חולמי מפתחות.png': 'keyring-shirts.png',
  'ערכת פתיחה.jpg': 'unlock-kit.jpg',
  'מיכל דלק.png': 'fuel-tank.png',
  'יוניט ברקס.jpg': 'brake-unit.jpg',
  'silicon-l.png': 'silicon-l.png',
  'silicon-s.png': 'silicon-s.png',
  'magnzyum.jpg': 'magnesium.jpg',
  'shhukim.jpg': 'jump-cables.jpg'
}

async function uploadEquipmentImages() {
  const sourceDir = path.join(__dirname, 'תמונות', 'ציוד')
  const results = []
  const errors = []

  console.log('🚀 Starting upload of equipment images...\n')

  // Get all files in directory
  const files = fs.readdirSync(sourceDir)
  const imageFiles = files.filter(f =>
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
  )

  console.log(`Found ${imageFiles.length} image files\n`)

  for (const originalFileName of imageFiles) {
    const englishFileName = fileNameMapping[originalFileName] || originalFileName
    const sourcePath = path.join(sourceDir, originalFileName)

    try {
      // Read file
      const fileBuffer = fs.readFileSync(sourcePath)
      const fileExt = englishFileName.split('.').pop()
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg'

      console.log(`📤 Uploading: ${originalFileName} → ${englishFileName}...`)

      // Upload to Supabase Storage in equipment folder
      const storagePath = `equipment/${englishFileName}`

      const { data, error } = await supabase.storage
        .from('equipment-images')
        .upload(storagePath, fileBuffer, {
          contentType: contentType,
          cacheControl: '3600',
          upsert: true // Allow overwriting
        })

      if (error) {
        console.log(`  ❌ Error: ${error.message}`)
        errors.push({
          file: originalFileName,
          englishName: englishFileName,
          error: error.message
        })
        continue
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('equipment-images')
        .getPublicUrl(storagePath)

      console.log(`  ✅ Uploaded: ${publicUrl}`)
      results.push({
        hebrewName: originalFileName,
        englishName: englishFileName,
        url: publicUrl
      })

    } catch (err) {
      console.error(`  ❌ Error processing ${originalFileName}:`, err.message)
      errors.push({
        file: originalFileName,
        englishName: englishFileName,
        error: err.message
      })
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 Upload Summary')
  console.log('='.repeat(80))
  console.log(`\n✅ Successfully uploaded: ${results.length}/${imageFiles.length}`)

  if (results.length > 0) {
    console.log('\nUploaded files:')
    results.forEach(r => {
      console.log(`  • ${r.hebrewName} → ${r.englishName}`)
      console.log(`    ${r.url}`)
    })
  }

  if (errors.length > 0) {
    console.log(`\n❌ Failed: ${errors.length}`)
    errors.forEach(e => {
      console.log(`  • ${e.file} → ${e.englishName}`)
      console.log(`    Error: ${e.error}`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('📋 Next Steps:')
  console.log('='.repeat(80))
  console.log('\n1. Copy the URLs above')
  console.log('2. Go to Supabase → Table Editor → equipment')
  console.log('3. Update the image_url column for each equipment item')
  console.log('\nOr run this SQL to see which equipment items need images:')
  console.log('\nSELECT id, name, image_url FROM equipment WHERE image_url IS NULL OR image_url NOT LIKE \'http%\';')
}

uploadEquipmentImages().catch(console.error)
