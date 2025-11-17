const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addIcons() {
  console.log('Adding icons to categories...')

  const updates = [
    ['פנצ\'ר', '🔧'],
    ['התנעה', '🔋'],
    ['דלק', '⛽'],
    ['ספריי', '🧴'],
    ['דלת טרוקה', '🚪'],
    ['פתיחה', '🔓'],
    ['דלק/שמן/מים', '🛢️'],
    ['סיירת', '🚗'],
    ['כלי עבודה כלליים', '🔨'],
    ['בטיחות', '🦺'],
    ['ג\'יפים', '🚙'],
    ['אחר/שונות', '📦']
  ]

  for (const [name, icon] of updates) {
    const { error } = await supabase
      .from('equipment_categories')
      .update({ icon })
      .eq('name', name)

    if (error) {
      console.error('❌ Error updating', name, ':', error.message)
    } else {
      console.log('✅', name, '→', icon)
    }
  }

  // Verify
  const { data, error } = await supabase
    .from('equipment_categories')
    .select('name, icon')
    .order('display_order')

  if (error) {
    console.error('❌ Error fetching categories:', error)
  } else {
    console.log('\n📋 All categories with icons:')
    data.forEach(cat => console.log(`  ${cat.icon || '❓'} ${cat.name}`))
  }
}

addIcons()
