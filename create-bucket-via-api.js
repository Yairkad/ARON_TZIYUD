const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createBucket() {
  console.log('Creating equipment-images bucket...')

  // Create the bucket
  const { data, error } = await supabase
    .storage
    .createBucket('equipment-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket already exists')
    } else {
      console.error('❌ Error creating bucket:', error)
      return
    }
  } else {
    console.log('✅ Bucket created successfully:', data)
  }

  // List buckets to verify
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    console.error('❌ Error listing buckets:', listError)
  } else {
    console.log('📁 Available buckets:', buckets.map(b => b.name))
  }
}

createBucket()
