/**
 * Vehicle Lookup API
 * GET /api/vehicle/lookup?plate=1234567 - Get vehicle details by license plate from data.gov.il
 * Returns vehicle info + PCD (bolt pattern) for wheel matching
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractMakeFromHebrew } from '@/lib/pcd-database'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// data.gov.il resource ID for vehicle database
const RESOURCE_ID = '053cea08-09bc-40ec-8f7a-156f0677aff3'

interface VehicleRecord {
  mispar_rechev: number
  tozeret_nm: string        // Manufacturer (Hebrew) - e.g. "פיאט תורכיה"
  tozeret_cd: number        // Manufacturer code
  kinuy_mishari: string     // Commercial name (Hebrew) - e.g. "QUBO"
  degem_nm: string          // Model name - e.g. "225AXF1A-07B"
  degem_cd: number          // Model code
  ramat_gimur: string       // Trim level - e.g. "ACTIVE"
  shnat_yitzur: number      // Year of manufacture
  sug_degem: string         // Model type
  baalut: string            // Ownership type
  misgeret: string          // Chassis number
  tzeva_cd: number          // Color code
  tzeva_rechev: string      // Vehicle color
  zmig_kidmi: string        // Front tire - e.g. "185/65R15"
  zmig_ahori: string        // Rear tire
  sug_delek_nm: string      // Fuel type
  horaat_rishum: number     // Registration instruction
  moed_aliya_lakvish: string // Road entry date
  tokef_dt: string          // License expiry date
  mivchan_acharon_dt: string // Last test date
}

interface DataGovResponse {
  success: boolean
  result: {
    records: VehicleRecord[]
    total: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plate = searchParams.get('plate')

    if (!plate) {
      return NextResponse.json(
        { error: 'Missing plate parameter' },
        { status: 400 }
      )
    }

    // Clean the plate number - remove dashes and spaces
    const cleanPlate = plate.replace(/[-\s]/g, '')

    // Validate plate format (7-8 digits)
    if (!/^\d{7,8}$/.test(cleanPlate)) {
      return NextResponse.json(
        { error: 'Invalid plate format. Expected 7-8 digits.' },
        { status: 400 }
      )
    }

    // Query data.gov.il API
    const apiUrl = new URL('https://data.gov.il/api/3/action/datastore_search')
    apiUrl.searchParams.set('resource_id', RESOURCE_ID)
    apiUrl.searchParams.set('q', cleanPlate)
    apiUrl.searchParams.set('limit', '1')

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 1 hour
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      console.error('data.gov.il API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch vehicle data from government database' },
        { status: 502 }
      )
    }

    const data: DataGovResponse = await response.json()

    if (!data.success || !data.result.records.length) {
      return NextResponse.json(
        { error: 'Vehicle not found', plate: cleanPlate },
        { status: 404 }
      )
    }

    const vehicle = data.result.records[0]

    // Try to find PCD data from Supabase database
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const makeEnglish = extractMakeFromHebrew(vehicle.tozeret_nm)

    let pcdData = null
    if (makeEnglish) {
      const modelName = vehicle.kinuy_mishari?.toLowerCase() || ''

      // First try: exact model match
      let { data: vehicleModels, error } = await supabase
        .from('vehicle_models')
        .select('*')
        .or(`make.ilike.%${makeEnglish}%,make_he.ilike.%${vehicle.tozeret_nm}%`)
        .ilike('model', `%${modelName}%`)
        .lte('year_from', vehicle.shnat_yitzur)
        .or(`year_to.gte.${vehicle.shnat_yitzur},year_to.is.null`)
        .limit(1)

      if (!error && vehicleModels && vehicleModels.length > 0) {
        pcdData = vehicleModels[0]
      }

      // Second try: search in variants column
      if (!pcdData) {
        const result = await supabase
          .from('vehicle_models')
          .select('*')
          .or(`make.ilike.%${makeEnglish}%,make_he.ilike.%${vehicle.tozeret_nm}%`)
          .ilike('variants', `%${modelName}%`)
          .lte('year_from', vehicle.shnat_yitzur)
          .or(`year_to.gte.${vehicle.shnat_yitzur},year_to.is.null`)
          .limit(1)

        if (!result.error && result.data && result.data.length > 0) {
          pcdData = result.data[0]
        }
      }

      // Third try: search for first word only (e.g., "PRIUS" from "PRIUS HYBRID")
      if (!pcdData && modelName.includes(' ')) {
        const firstWord = modelName.split(' ')[0]
        const result = await supabase
          .from('vehicle_models')
          .select('*')
          .or(`make.ilike.%${makeEnglish}%,make_he.ilike.%${vehicle.tozeret_nm}%`)
          .ilike('model', `%${firstWord}%`)
          .lte('year_from', vehicle.shnat_yitzur)
          .or(`year_to.gte.${vehicle.shnat_yitzur},year_to.is.null`)
          .limit(1)

        if (!result.error && result.data && result.data.length > 0) {
          pcdData = result.data[0]
        }
      }
    }

    // Return cleaned vehicle data with PCD
    return NextResponse.json({
      success: true,
      vehicle: {
        plate: vehicle.mispar_rechev,
        manufacturer: vehicle.tozeret_nm,        // יצרן בעברית - e.g. "פיאט תורכיה"
        manufacturer_code: vehicle.tozeret_cd,
        model: vehicle.kinuy_mishari,            // שם מסחרי - e.g. "QUBO"
        model_name: vehicle.degem_nm,            // שם דגם טכני
        model_code: vehicle.degem_cd,
        trim: vehicle.ramat_gimur,               // רמת גימור
        year: vehicle.shnat_yitzur,              // שנת ייצור
        color: vehicle.tzeva_rechev,             // צבע
        fuel_type: vehicle.sug_delek_nm,         // סוג דלק
        front_tire: vehicle.zmig_kidmi,          // צמיג קדמי - e.g. "185/65R15"
        rear_tire: vehicle.zmig_ahori,           // צמיג אחורי
        license_expiry: vehicle.tokef_dt,        // תוקף רישיון
        last_test: vehicle.mivchan_acharon_dt,   // טסט אחרון
        road_entry_date: vehicle.moed_aliya_lakvish, // תאריך עלייה לכביש
        ownership: vehicle.baalut,               // בעלות
        chassis: vehicle.misgeret,               // מספר שלדה
      },
      // PCD data for wheel matching
      wheel_fitment: pcdData ? {
        bolt_count: pcdData.bolt_count,          // כמות ברגים - e.g. 4 or 5
        bolt_spacing: pcdData.bolt_spacing,      // מרחק בין הברגים - e.g. 98, 100, 108
        pcd: `${pcdData.bolt_count}x${pcdData.bolt_spacing}`, // e.g. "4x98"
        center_bore: pcdData.center_bore,        // קוטר מרכזי
      } : null,
      pcd_found: !!pcdData
    })

  } catch (error) {
    console.error('Error in vehicle lookup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
