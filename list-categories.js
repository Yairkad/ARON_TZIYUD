const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please set:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function listCategories() {
  console.log('📋 רשימת קטגוריות קיימות:\n')

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, icon')
    .order('name')

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!categories || categories.length === 0) {
    console.log('⚠️  לא נמצאו קטגוריות')
    return
  }

  console.log(`סה"כ ${categories.length} קטגוריות:\n`)

  categories.forEach((cat, index) => {
    console.log(`${index + 1}. ${cat.name}`)
    console.log(`   ID: ${cat.id}`)
    console.log(`   Icon: ${cat.icon || '(אין תמונה)'}`)
    console.log('')
  })
}

listCategories()
