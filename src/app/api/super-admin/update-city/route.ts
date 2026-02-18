import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * Extract coordinates from a Google Maps URL
 */
function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null

  try {
    // Pattern 1: /@lat,lng,zoom format
    const pattern1 = /@(-?\d+\.?\d*),(-?\d+\.?\d*),/
    const match1 = url.match(pattern1)
    if (match1) {
      return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) }
    }

    // Pattern 2: ?q=lat,lng format
    const pattern2 = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const match2 = url.match(pattern2)
    if (match2) {
      return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) }
    }

    // Pattern 3: /place/.../@lat,lng format
    const pattern3 = /\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const match3 = url.match(pattern3)
    if (match3) {
      return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) }
    }

    // Pattern 4: ll=lat,lng format
    const pattern4 = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const match4 = url.match(pattern4)
    if (match4) {
      return { lat: parseFloat(match4[1]), lng: parseFloat(match4[2]) }
    }

    return null
  } catch (error) {
    console.error('Error extracting coordinates:', error)
    return null
  }
}

/**
 * Expand short URL and extract coordinates
 */
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
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        urlToProcess = response.url
      } catch (fetchError) {
        console.error('Error expanding URL:', fetchError)
      }
    }

    return extractCoordinatesFromUrl(urlToProcess)
  } catch (error) {
    console.error('Error in expandAndExtractCoords:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      cityId,
      name,
      manager1_name,
      manager1_phone,
      manager2_name,
      manager2_phone,
      location_url,
      token_location_url,
      is_active
    } = await request.json()

    if (!cityId || !name || !manager1_name || !manager1_phone) {
      return NextResponse.json(
        { error: 'אנא מלא את כל השדות החובה (שם עיר, מנהל ראשון, טלפון)' },
        { status: 400 }
      )
    }

    if (manager1_phone.length !== 10) {
      return NextResponse.json(
        { error: 'טלפון מנהל ראשון חייב להיות בן 10 ספרות' },
        { status: 400 }
      )
    }

    if (manager2_phone && manager2_phone.length !== 10) {
      return NextResponse.json(
        { error: 'טלפון מנהל שני חייב להיות בן 10 ספרות (או השאר ריק)' },
        { status: 400 }
      )
    }

    // Try to extract coordinates from token_location_url
    let coordsUpdate: { token_lat?: number; token_lng?: number; public_lat?: number; public_lng?: number } = {}

    if (token_location_url) {
      const coords = await expandAndExtractCoords(token_location_url)
      if (coords) {
        coordsUpdate = {
          token_lat: coords.lat,
          token_lng: coords.lng,
          public_lat: coords.lat,
          public_lng: coords.lng,
        }
        console.log(`Extracted coordinates from token_location_url: ${coords.lat}, ${coords.lng}`)
      }
    }

    const { error: updateError } = await supabaseServer
      .from('cities')
      .update({
        name,
        manager1_name,
        manager1_phone,
        manager2_name: manager2_name || null,
        manager2_phone: manager2_phone || null,
        location_url: location_url || null,
        token_location_url: token_location_url || null,
        is_active: is_active !== undefined ? is_active : true,
        ...coordsUpdate
      })
      .eq('id', cityId)

    if (updateError) {
      console.error('Error updating city:', updateError)
      return NextResponse.json(
        { error: 'שגיאה בעדכון העיר' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'העיר עודכנה בהצלחה',
      coordsExtracted: Object.keys(coordsUpdate).length > 0
    })
  } catch (error) {
    console.error('Update city error:', error)
    return NextResponse.json(
      { error: 'שגיאה בתהליך עדכון העיר' },
      { status: 500 }
    )
  }
}
