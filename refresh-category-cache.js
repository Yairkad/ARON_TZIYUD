const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function refreshCategoryCache() {
  console.log('🔄 מרענן cache של תמונות קטגוריות...\n')

  // קבל את כל הקטגוריות
  const { data: categories, error } = await supabase
    .from('equipment_categories')
    .select('id, name, icon')

  if (error) {
    console.error('❌ שגיאה:', error)
    return
  }

  console.log(`📋 נמצאו ${categories.length} קטגוריות\n`)

  const timestamp = Date.now()
  let updatedCount = 0

  for (const category of categories) {
    if (!category.icon || !category.icon.startsWith('http')) {
      console.log(`⏭️  ${category.name} - אין URL, מדלג...`)
      continue
    }

    // הסר cache bust ישן אם יש
    const baseUrl = category.icon.split('?')[0]

    // הוסף cache bust חדש
    const newUrl = `${baseUrl}?v=${timestamp}`

    const { error: updateError } = await supabase
      .from('equipment_categories')
      .update({ icon: newUrl })
      .eq('id', category.id)

    if (updateError) {
      console.error(`❌ ${category.name} - שגיאה: ${updateError.message}`)
    } else {
      console.log(`✅ ${category.name} - עודכן`)
      updatedCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ סיום! עודכנו ${updatedCount} מתוך ${categories.length} קטגוריות`)
  console.log('🔄 רענן את הדפדפן (Ctrl+F5) כדי לראות את השינויים')
  console.log('='.repeat(50))
}

refreshCategoryCache()
