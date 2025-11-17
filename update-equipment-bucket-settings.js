const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateBucket() {
  console.log('Updating equipment-images bucket settings...')

  const { data, error } = await supabase
    .storage
    .updateBucket('equipment-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    })

  if (error) {
    console.error('❌ Error updating bucket:', error)
  } else {
    console.log('✅ Bucket updated successfully:', data)
  }

  // Get bucket details to verify
  const { data: bucket, error: getError } = await supabase
    .storage
    .getBucket('equipment-images')

  if (getError) {
    console.error('❌ Error getting bucket:', getError)
  } else {
    console.log('📁 Bucket details:', bucket)
  }
}

updateBucket()
