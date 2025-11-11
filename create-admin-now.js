/**
 * Script to create Super Admin user via Supabase Auth API
 */

const SUPABASE_URL = 'https://jgkmcsxrtovrdiguhwyv.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna21jc3hydG92cmRpZ3Vod3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjEwNzExMiwiZXhwIjoyMDc3NjgzMTEyfQ.yTAJKE4koX56lJ8ZA0utYf9x2Ytj_mLHwIOzt-xpYxY'

async function createSuperAdmin() {
  try {
    console.log('🔄 יוצר משתמש Super Admin...')
    console.log('Email: yk74re@gmail.com')
    console.log('Password: Admin2025')

    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        email: 'yk74re@gmail.com',
        password: 'Admin2025',
        email_confirm: true,
        user_metadata: {
          full_name: 'Super Admin',
          role: 'super_admin',
          permissions: 'full_access'
        }
      })
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Super Admin נוצר בהצלחה!')
      console.log('User ID:', data.id)
      console.log('Email:', data.email)
      console.log('\n📝 פרטי התחברות:')
      console.log('Email: yk74re@gmail.com')
      console.log('Password: Admin2025')
      console.log('\n🌐 התחבר כאן: https://aron-tziyud.vercel.app/super-admin')
    } else {
      console.error('❌ שגיאה ביצירת משתמש:', data)
    }
  } catch (error) {
    console.error('❌ שגיאה:', error.message)
  }
}

createSuperAdmin()
