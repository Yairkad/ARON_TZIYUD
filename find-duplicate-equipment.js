const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function normalize(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[״"']/g, '') // Remove quotes
    .toLowerCase()
}

function areSimilar(str1, str2) {
  const norm1 = normalize(str1)
  const norm2 = normalize(str2)

  // Exact match after normalization
  if (norm1 === norm2) return true

  // One contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true

  // Check with common variations
  const variations = [
    [/ברגי?/, 'בורג'],
    [/בורג/, 'ברגי'],
    [/ספריי?/, 'ספריי'],
    [/ג'יק/, "ג'ק"],
    [/ג'ק/, "ג'יק"],
    [/קומפרסור/, 'קומפרסור'],
    [/מפתח/, 'מפתח'],
    [/ונטיל/, 'ונטיל'],
    [/ונטילים/, 'ונטיל']
  ]

  let modified1 = norm1
  let modified2 = norm2

  variations.forEach(([pattern, replacement]) => {
    modified1 = modified1.replace(pattern, replacement)
    modified2 = modified2.replace(pattern, replacement)
  })

  if (modified1 === modified2) return true
  if (modified1.includes(modified2) || modified2.includes(modified1)) return true

  return false
}

async function findDuplicates() {
  console.log('🔍 Searching for duplicate/similar equipment items...\n')

  // Fetch all equipment
  const { data: allEquipment, error } = await supabase
    .from('equipment')
    .select('id, name, city_id, category_id, quantity')
    .order('name')

  if (error) {
    console.error('❌ Error fetching equipment:', error)
    return
  }

  console.log(`📋 Found ${allEquipment.length} equipment items\n`)

  const duplicateGroups = []
  const processed = new Set()

  for (let i = 0; i < allEquipment.length; i++) {
    if (processed.has(i)) continue

    const item1 = allEquipment[i]
    const group = [item1]
    processed.add(i)

    for (let j = i + 1; j < allEquipment.length; j++) {
      if (processed.has(j)) continue

      const item2 = allEquipment[j]

      if (areSimilar(item1.name, item2.name)) {
        group.push(item2)
        processed.add(j)
      }
    }

    if (group.length > 1) {
      duplicateGroups.push(group)
    }
  }

  console.log('='.repeat(80))
  console.log(`🔍 Found ${duplicateGroups.length} groups of similar items`)
  console.log('='.repeat(80) + '\n')

  duplicateGroups.forEach((group, index) => {
    console.log(`\n📦 Group ${index + 1}: (${group.length} items)`)
    console.log('-'.repeat(80))

    group.forEach(item => {
      console.log(`  • "${item.name}"`)
      console.log(`    ID: ${item.id} | City: ${item.city_id} | Quantity: ${item.quantity}`)
    })
  })

  console.log('\n' + '='.repeat(80))
  console.log('📊 Summary')
  console.log('='.repeat(80))
  console.log(`Total duplicate groups: ${duplicateGroups.length}`)
  console.log(`Total items in duplicates: ${duplicateGroups.reduce((sum, g) => sum + g.length, 0)}`)
  console.log(`Unique items: ${allEquipment.length - duplicateGroups.reduce((sum, g) => sum + g.length - 1, 0)}`)

  // Generate SQL to help clean up
  console.log('\n' + '='.repeat(80))
  console.log('🔧 Suggested Actions')
  console.log('='.repeat(80))
  console.log('\nReview each group and decide which items to keep/merge.')
  console.log('Consider:')
  console.log('  1. Which name is most accurate?')
  console.log('  2. Are they in the same city?')
  console.log('  3. Should quantities be merged?')
}

findDuplicates().catch(console.error)
