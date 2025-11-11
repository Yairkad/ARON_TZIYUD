/**
 * Script to create Super Admin user via API
 * Run with: node create-super-admin.js
 */

const SUPABASE_URL = 'YOUR_SUPABASE_URL'
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'

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
