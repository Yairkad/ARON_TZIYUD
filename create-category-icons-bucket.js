const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createBucket() {
  console.log('Creating category-icons bucket...')

  const { data, error } = await supabase
    .storage
    .createBucket('category-icons', {
      public: true,
      fileSizeLimit: 2097152, // 2MB (enough for icons)
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket already exists')
    } else {
      console.error('❌ Error creating bucket:', error)
      return
    }
  } else {
    console.log('✅ Bucket created successfully')
  }

  console.log('\n📋 Instructions:')
  console.log('1. Upload your category icons to Supabase Storage -> category-icons bucket')
  console.log('2. Name them like: tire.png, battery.png, fuel.png, etc.')
  console.log('3. Update the icon URLs in equipment_categories table')
  console.log('\nOr use the admin panel to upload icons per category!')
}

createBucket()
