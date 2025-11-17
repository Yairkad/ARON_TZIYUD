const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Read .env.local file
const envFile = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Function to add offset to coordinates (~750m)
// 1 degree latitude ≈ 111km
// 1 degree longitude ≈ 111km * cos(latitude)
function addOffset(lat, lng) {
  const offsetKm = 0.75 // 750 meters
  const latOffset = offsetKm / 111
  const lngOffset = offsetKm / (111 * Math.cos(lat * Math.PI / 180))

  // Add random direction
  const angle = Math.random() * 2 * Math.PI
  const newLat = lat + (latOffset * Math.sin(angle))
  const newLng = lng + (lngOffset * Math.cos(angle))

  return {
    public_lat: Math.round(newLat * 10000000) / 10000000,
    public_lng: Math.round(newLng * 10000000) / 10000000
  }
}

async function addPublicLocations() {
  console.log('🔍 Fetching cities with exact locations...\n')

  const { data: cities, error } = await supabase
    .from('cities')
    .select('id, name, lat, lng, public_lat, public_lng, is_active')
    .eq('is_active', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!cities || cities.length === 0) {
    console.log('❌ No cities found with exact locations')
    return
  }

  console.log(`✅ Found ${cities.length} cities with exact locations\n`)
  console.log('📝 Adding public (approximate) locations...\n')

  for (const city of cities) {
    if (city.public_lat && city.public_lng) {
      console.log(`⏭️  Skipping ${city.name} - already has public location`)
      continue
    }

    const { public_lat, public_lng } = addOffset(city.lat, city.lng)

    const { error: updateError } = await supabase
      .from('cities')
      .update({ public_lat, public_lng })
      .eq('id', city.id)

    if (updateError) {
      console.error(`❌ Error updating ${city.name}:`, updateError)
    } else {
      console.log(`✅ ${city.name}`)
      console.log(`   Exact: ${city.lat}, ${city.lng}`)
      console.log(`   Public: ${public_lat}, ${public_lng}`)
      console.log(`   Distance: ~750m offset\n`)
    }
  }

  console.log('\n✅ Done! All cities now have public locations.')
  console.log('🗺️  Visit http://localhost:3000/cabinets-map to see the map!')
}

addPublicLocations().catch(console.error)
