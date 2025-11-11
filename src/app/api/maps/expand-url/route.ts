import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to expand short Google Maps URLs and extract coordinates
 * Handles short URLs like https://maps.app.goo.gl/xxxxx
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'חסר URL' },
        { status: 400 }
      )
    }

    // Check if this is a short URL that needs expansion
    const isShortUrl = url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')

    if (!isShortUrl) {
      // Not a short URL, try to extract coordinates directly
      const coords = extractCoordinatesFromUrl(url)
      if (coords) {
        return NextResponse.json({
          success: true,
          lat: coords.lat,
          lng: coords.lng,
          expandedUrl: url
        })
      } else {
        return NextResponse.json(
          { error: 'לא ניתן לחלץ קואורדינטות מה-URL' },
          { status: 400 }
        )
      }
    }

    // Expand the short URL by following redirects
    let expandedUrl = url
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      expandedUrl = response.url
    } catch (fetchError) {
      console.error('Error expanding URL:', fetchError)
      return NextResponse.json(
        { error: 'שגיאה בהרחבת ה-URL הקצר' },
        { status: 500 }
      )
    }

    // Extract coordinates from the expanded URL
    const coords = extractCoordinatesFromUrl(expandedUrl)

    if (!coords) {
      return NextResponse.json(
        { error: 'לא ניתן לחלץ קואורדינטות מה-URL המורחב' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      lat: coords.lat,
      lng: coords.lng,
      expandedUrl
    })

  } catch (error) {
    console.error('Expand URL error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}

/**
 * Extract coordinates from a Google Maps URL
 * Supports multiple URL formats
 */
function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null

  // Pattern 1: /@lat,lng,zoom format
  const pattern1 = /@(-?\d+\.?\d*),(-?\d+\.?\d*),/
  const match1 = url.match(pattern1)
  if (match1) {
    return {
      lat: parseFloat(match1[1]),
      lng: parseFloat(match1[2])
    }
  }

  // Pattern 2: ?q=lat,lng format
  const pattern2 = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/
  const match2 = url.match(pattern2)
  if (match2) {
    return {
      lat: parseFloat(match2[1]),
      lng: parseFloat(match2[2])
    }
  }

  // Pattern 3: /place/.../@lat,lng format (more specific)
  const pattern3 = /\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/
  const match3 = url.match(pattern3)
  if (match3) {
    return {
      lat: parseFloat(match3[1]),
      lng: parseFloat(match3[2])
    }
  }

  // Pattern 4: ll=lat,lng format
  const pattern4 = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/
  const match4 = url.match(pattern4)
  if (match4) {
    return {
      lat: parseFloat(match4[1]),
      lng: parseFloat(match4[2])
    }
  }

  return null
}
