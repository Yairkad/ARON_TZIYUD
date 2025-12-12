import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    // Security: Only allow this in development or with admin key
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_IMPORT_KEY || 'import-2024-secret'

    if (authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let csvContent: string
    let source: string

    // Check if request has file upload or Google Sheets URL
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      csvContent = await file.text()
      source = `Uploaded file: ${file.name}`
    } else {
      // Handle Google Sheets URL
      const body = await request.json().catch(() => ({}))
      const sheetsUrl = body.sheetsUrl || process.env.VEHICLE_DATA_SHEETS_URL

      if (!sheetsUrl) {
        return NextResponse.json({
          error: 'Provide either a file upload (multipart/form-data) or sheetsUrl in JSON body'
        }, { status: 400 })
      }

      // Convert Google Sheets URL to CSV export URL
      // From: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid=0
      // To: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid=0
      let csvUrl = sheetsUrl
      if (sheetsUrl.includes('/edit')) {
        const sheetId = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
        const gid = sheetsUrl.match(/gid=(\d+)/)?.[1] || '0'
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
      }

      // Fetch CSV from Google Sheets
      const response = await fetch(csvUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`)
      }
      csvContent = await response.text()
      source = `Google Sheets: ${csvUrl}`
    }

    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',')

    const vehicles = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')

      if (values.length >= 9) {
        vehicles.push({
          make: values[0]?.trim() || '',
          make_he: values[1]?.trim() || '',
          model: values[2]?.trim() || '',
          variants: values[3]?.trim() || null,
          year_from: values[4] ? parseInt(values[4]) : null,
          year_to: values[5] ? parseInt(values[5]) : null,
          bolt_count: values[6] ? parseInt(values[6]) : 0,
          bolt_spacing: values[7] ? parseFloat(values[7]) : 0,
          center_bore: values[8] ? parseFloat(values[8]) : null,
          source: 'import',
          added_by: null
        })
      }
    }

    // Insert in batches (Supabase has a limit)
    const batchSize = 100
    let inserted = 0

    for (let i = 0; i < vehicles.length; i += batchSize) {
      const batch = vehicles.slice(i, i + batchSize)
      const { error } = await supabase
        .from('vehicle_models')
        .insert(batch)

      if (error) {
        console.error('Batch insert error:', error)
        return NextResponse.json({
          error: 'Insert failed',
          details: error.message,
          inserted,
          total: vehicles.length
        }, { status: 500 })
      }

      inserted += batch.length
    }

    return NextResponse.json({
      success: true,
      imported: inserted,
      total: vehicles.length,
      source
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
