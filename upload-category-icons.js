const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapping Hebrew filenames to English and category names
const fileMapping = {
  'בטיחות.png': { english: 'safety.png', category: 'בטיחות' },
  "ג'יפים.png": { english: 'jeeps.png', category: "ג'יפים" },
  'הנעה.png': { english: 'battery.png', category: 'התנעה' },
  'כללי.png': { english: 'tools.png', category: 'כלי עבודה כלליים' },
  'פנצ\'ר.png': { english: 'tire.png', category: 'פנצ\'ר' },
  'פתיחה.png': { english: 'unlock.png', category: 'פתיחה' },
  'שאיבה.png': { english: 'fluids.png', category: 'דלק/שמן/מים' }
}

async function uploadIcons() {
  const sourceDir = path.join(__dirname, 'תמונות', 'קטגוריות')
  const results = []

  console.log('🚀 Starting upload of category icons...\n')

  for (const [hebrewName, { english, category }] of Object.entries(fileMapping)) {
    const sourcePath = path.join(sourceDir, hebrewName)

    if (!fs.existsSync(sourcePath)) {
      console.log(`⚠️  File not found: ${hebrewName}`)
      continue
    }

    try {
      // Read file
      const fileBuffer = fs.readFileSync(sourcePath)
      const fileName = english

      console.log(`📤 Uploading ${hebrewName} → ${fileName}...`)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('category-icons')
        .upload(fileName, fileBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true // Allow overwriting
        })

      if (error) {
        console.error(`❌ Error uploading ${fileName}:`, error.message)
        continue
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('category-icons')
        .getPublicUrl(fileName)

      console.log(`✅ Uploaded: ${publicUrl}`)

      results.push({ category, url: publicUrl })

    } catch (err) {
      console.error(`❌ Error processing ${hebrewName}:`, err.message)
    }
  }

  console.log('\n📋 SQL to update categories:\n')
  console.log('ALTER TABLE equipment_categories ADD COLUMN IF NOT EXISTS icon TEXT;\n')

  for (const { category, url } of results) {
    const escapedCategory = category.replace(/'/g, "''")
    console.log(`UPDATE equipment_categories SET icon = '${url}' WHERE name = '${escapedCategory}';`)
  }

  console.log('\n✅ Done! Copy the SQL above and run it in Supabase SQL Editor.')
}

uploadIcons()
