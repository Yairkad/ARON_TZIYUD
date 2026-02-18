import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null

  try {
    const pattern1 = /@(-?\d+\.?\d*),(-?\d+\.?\d*),/
    const match1 = url.match(pattern1)
    if (match1) return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) }

    const pattern2 = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const match2 = url.match(pattern2)
    if (match2) return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) }

    const pattern3 = /\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const match3 = url.match(pattern3)
    if (match3) return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) }

    const pattern4 = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const match4 = url.match(pattern4)
    if (match4) return { lat: parseFloat(match4[1]), lng: parseFloat(match4[2]) }

    return null
  } catch {
    return null
  }
}

async function expandAndExtractCoords(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null

  try {
    const isShortUrl = url.includes('maps.app.goo.gl') ||
                       url.includes('goo.gl/maps') ||
                       url.includes('app.goo.gl')

    let urlToProcess = url

    if (isShortUrl) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        })
        urlToProcess = response.url
      } catch {
        // fall through to try original URL
      }
    }

    return extractCoordinatesFromUrl(urlToProcess)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get all active cities missing public coords
    const { data: cities, error } = await supabaseServer
      .from('cities')
      .select('id, name, token_lat, token_lng, token_location_url, public_lat, public_lng')
      .eq('is_active', true)
      .or('public_lat.is.null,public_lng.is.null')

    if (error) throw error

    let updated = 0
    let failed = 0
    let noData = 0
    const details: { name: string; result: string }[] = []

    for (const city of cities ?? []) {
      // Case 1: already has token coords → copy to public
      if (city.token_lat && city.token_lng) {
        const { error: updateError } = await supabaseServer
          .from('cities')
          .update({ public_lat: city.token_lat, public_lng: city.token_lng })
          .eq('id', city.id)

        if (!updateError) {
          updated++
          details.push({ name: city.name, result: 'עודכן מקואורדינטות token' })
        } else {
          failed++
          details.push({ name: city.name, result: 'שגיאה בעדכון' })
        }
        continue
      }

      // Case 2: no token coords but has token_location_url → try to extract
      if (city.token_location_url) {
        const coords = await expandAndExtractCoords(city.token_location_url)
        if (coords) {
          const { error: updateError } = await supabaseServer
            .from('cities')
            .update({
              token_lat: coords.lat,
              token_lng: coords.lng,
              public_lat: coords.lat,
              public_lng: coords.lng,
            })
            .eq('id', city.id)

          if (!updateError) {
            updated++
            details.push({ name: city.name, result: `עודכן מ-URL (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` })
          } else {
            failed++
            details.push({ name: city.name, result: 'שגיאה בעדכון' })
          }
          continue
        }
      }

      // Case 3: no data available
      noData++
      details.push({ name: city.name, result: 'אין קואורדינטות — נדרש עדכון ידני' })
    }

    return NextResponse.json({
      success: true,
      total: cities?.length ?? 0,
      updated,
      failed,
      noData,
      details
    })
  } catch (error) {
    console.error('fill-coordinates error:', error)
    return NextResponse.json({ error: 'שגיאה בעדכון הקואורדינטות' }, { status: 500 })
  }
}
