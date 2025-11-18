const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapping Hebrew equipment names to uploaded image URLs
const equipmentImageMapping = {
  'אצבע': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/etsba.png',
  'מגנזיום': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/magnesium.jpg',
  'שוקים': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/jump-cables.jpg',
  'בורג סיליקון גדול': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/silicon-l.png',
  'בורג סיליקון קטן': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/silicon-s.png',
  'ג\'ק בקבוק': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/jack-bottle.png',
  'ג\'ק מספריים ראצ\'ט': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/jack-scissors-ratchet.jpg',
  'ג\'יק עגלה': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/jack-cart.png',
  'חולמי מפתחות': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/keyring-shirts.png',
  'יוניט ברקס': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/brake-unit.jpg',
  'מיכל דלק': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/fuel-tank.png',
  'מפתח ונטיל': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/valve-wrench.jpg',
  'מפתח צלב': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/cross-wrench.png',
  'מתאם טסלה': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/tesla-adapter.png',
  'ספריי פנצ\'ר [יש לקנות חדש ולהחזיר לארון / לשלם]': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/tire-spray.jpg',
  'ספריי קרבורטור [יש לקנות חדש ולהחזיר לארון / לשלם]': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/carburetor-spray.png',
  'ספריי שמן [יש לקנות חדש ולהחזיר לארון / לשלם]': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/oil-spray.jpg',
  'ערכת פתיחה': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/unlock-kit.jpg',
  'קומפרסור': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/compressor.png',
  'תולעים': 'https://jgkmcsxrtovrdiguhwyv.supabase.co/storage/v1/object/public/equipment-images/equipment/worms.jpg'
}

async function updateEquipmentImages() {
  console.log('🚀 Starting to update equipment images in database...\n')

  // First, fetch all equipment items
  const { data: allEquipment, error: fetchError } = await supabase
    .from('equipment')
    .select('id, name, image_url')

  if (fetchError) {
    console.error('❌ Error fetching equipment:', fetchError)
    return
  }

  console.log(`📋 Found ${allEquipment.length} equipment items in database\n`)

  const updated = []
  const notFound = []
  const skipped = []

  for (const item of allEquipment) {
    const imageUrl = equipmentImageMapping[item.name]

    if (imageUrl) {
      // Check if already has the correct image
      if (item.image_url === imageUrl) {
        console.log(`⏭️  Skipping "${item.name}" - already has correct image`)
        skipped.push(item.name)
        continue
      }

      // Update the image_url
      const { error: updateError } = await supabase
        .from('equipment')
        .update({ image_url: imageUrl })
        .eq('id', item.id)

      if (updateError) {
        console.error(`❌ Error updating "${item.name}":`, updateError.message)
      } else {
        console.log(`✅ Updated "${item.name}"`)
        console.log(`   ${imageUrl}`)
        updated.push(item.name)
      }
    } else {
      console.log(`⚠️  No image found for "${item.name}"`)
      notFound.push(item.name)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 Update Summary')
  console.log('='.repeat(80))
  console.log(`\n✅ Updated: ${updated.length}`)
  if (updated.length > 0) {
    updated.forEach(name => console.log(`   • ${name}`))
  }

  console.log(`\n⏭️  Skipped (already correct): ${skipped.length}`)
  if (skipped.length > 0) {
    skipped.forEach(name => console.log(`   • ${name}`))
  }

  console.log(`\n⚠️  Not found in mapping: ${notFound.length}`)
  if (notFound.length > 0) {
    notFound.forEach(name => console.log(`   • ${name}`))
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ Done!')
  console.log('\nYou can manually update the items that were not found.')
}

updateEquipmentImages().catch(console.error)
