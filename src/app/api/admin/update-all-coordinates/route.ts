import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * Admin API to batch update coordinates for all cities
 * Expands short URLs and extracts coordinates automatically
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get all cities
    const { data: cities, error: fetchError } = await supabase
      .from('cities')
      .select('id, name, location_url, token_location_url, lat, lng, token_lat, token_lng')
      .order('name')

    if (fetchError) {
      console.error('Error fetching cities:', fetchError)
      return NextResponse.json(
        { error: 'שגיאה בשליפת ערים' },
        { status: 500 }
      )
    }

    if (!cities || cities.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'אין ערים לעדכון',
        updated: 0,
        failed: 0
      })
    }

    const results = []
    let updated = 0
    let failed = 0
    let skipped = 0

    // Process each city
    for (const city of cities) {
      try {
        let needsUpdate = false
        const updateData: any = {}

        // Check location_url
        if (city.location_url && (!city.lat || !city.lng)) {
          const coords = await expandAndExtractCoords(city.location_url)
          if (coords) {
            updateData.lat = coords.lat
            updateData.lng = coords.lng
            needsUpdate = true
          }
        }

        // Check token_location_url
        if (city.token_location_url && (!city.token_lat || !city.token_lng)) {
          const coords = await expandAndExtractCoords(city.token_location_url)
          if (coords) {
            updateData.token_lat = coords.lat
            updateData.token_lng = coords.lng
            needsUpdate = true
          }
        }

        if (needsUpdate) {
          // Update the city with new coordinates
          const { error: updateError } = await supabase
            .from('cities')
            .update(updateData)
            .eq('id', city.id)

          if (updateError) {
            console.error(`Error updating city ${city.name}:`, updateError)
            results.push({
              city: city.name,
              status: 'failed',
              error: updateError.message
            })
            failed++
          } else {
            results.push({
              city: city.name,
              status: 'updated',
              coordinates: updateData
            })
            updated++
          }
        } else {
          results.push({
            city: city.name,
            status: 'skipped',
            reason: 'No URLs or coordinates already exist'
          })
          skipped++
        }
      } catch (error: any) {
        console.error(`Error processing city ${city.name}:`, error)
        results.push({
          city: city.name,
          status: 'failed',
          error: error.message
        })
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `עודכנו ${updated} ערים, ${failed} נכשלו, ${skipped} דילגו`,
      updated,
      failed,
      skipped,
      total: cities.length,
      results
    })

  } catch (error) {
    console.error('Batch update coordinates error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת' },
      { status: 500 }
    )
  }
}

/**
 * Expand short URL and extract coordinates
 */
async function expandAndExtractCoords(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null

  try {
    // Check if this is a short URL that needs expansion
    const isShortUrl = url.includes('maps.app.goo.gl') ||
                       url.includes('goo.gl/maps') ||
                       url.includes('app.goo.gl')

    let urlToProcess = url

    if (isShortUrl) {
      // Expand the short URL by following redirects
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        urlToProcess = response.url
      } catch (fetchError) {
        console.error('Error expanding URL:', fetchError)
        // Fall through to try extracting from original URL
      }
    }

    // Extract coordinates from the URL
    return extractCoordinatesFromUrl(urlToProcess)
  } catch (error) {
    console.error('Error in expandAndExtractCoords:', error)
    return null
  }
}

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

    // Pattern 3: /place/.../@lat,lng format
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

    // Pattern 5: Decimal degrees format like 32°02'53.9"N 34°57'28.1"E
    const pattern5 = /(\d+)°(\d+)'([\d.]+)"[NS]\s+(\d+)°(\d+)'([\d.]+)"[EW]/
    const match5 = url.match(pattern5)
    if (match5) {
      const lat = parseFloat(match5[1]) + parseFloat(match5[2])/60 + parseFloat(match5[3])/3600
      const lng = parseFloat(match5[4]) + parseFloat(match5[5])/60 + parseFloat(match5[6])/3600
      return { lat, lng }
    }

    return null
  } catch (error) {
    console.error('Error extracting coordinates:', error)
    return null
  }
}
