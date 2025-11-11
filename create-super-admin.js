/**
 * Script to create Super Admin user via API
 * Run with: node create-super-admin.js
 */

// Get these from your Supabase project settings:
// Dashboard → Settings → API → Project URL and service_role key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ חסרים משתני סביבה:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nהוסף אותם לקובץ .env.local:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_project_url')
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  process.exit(1)
}

async function createSuperAdmin() {
  try {
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
      console.log('✅ Super Admin created successfully!')
      console.log('User ID:', data.id)
      console.log('Email:', data.email)
    } else {
      console.error('❌ Error creating user:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createSuperAdmin()
