/**
 * Scrape vehicle PCD data from wheel-size.com
 * POST /api/vehicle-models/scrape
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { make, model, year } = body

    if (!make || !model || !year) {
      return NextResponse.json({
        error: 'Missing required fields: make, model, year'
      }, { status: 400 })
    }

    // Construct wheel-size.com URL
    const makeSlug = make.toLowerCase().replace(/\s+/g, '-')
    const modelSlug = model.toLowerCase().replace(/\s+/g, '-')
    const url = `https://www.wheel-size.com/size/${makeSlug}/${modelSlug}/${year}/`

    console.log('Fetching from wheel-size.com:', url)

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json({
        error: `Failed to fetch from wheel-size.com: ${response.status}`,
        url
      }, { status: 404 })
    }

    const html = await response.text()

    // Parse PCD data from HTML
    // Looking for patterns like "5x114.3" or "4x100"
    const pcdRegex = /(\d+)x([\d.]+)/g
    const pcdMatches = [...html.matchAll(pcdRegex)]

    if (pcdMatches.length === 0) {
      return NextResponse.json({
        error: 'Could not find PCD data on the page',
        url
      }, { status: 404 })
    }

    // Get the first PCD match (most common)
    const [, boltCount, boltSpacing] = pcdMatches[0]

    // Try to extract center bore
    // Looking for patterns like "CB: 64.1" or "Center Bore: 64.1mm"
    const centerBoreRegex = /(?:CB|Center\s+Bore)[\s:]+?([\d.]+)/i
    const centerBoreMatch = html.match(centerBoreRegex)
    const centerBore = centerBoreMatch ? parseFloat(centerBoreMatch[1]) : null

    // Try to extract rim sizes
    // Looking for patterns like 'R15', 'R16', etc.
    const rimSizeRegex = /R(\d+)/g
    const rimSizeMatches = [...html.matchAll(rimSizeRegex)]
    const rimSizes = [...new Set(rimSizeMatches.map(m => m[1]))].sort()

    // Try to extract tire sizes
    // Looking for patterns like "195/65R15" or "205/55R16"
    const tireSizeRegex = /(\d{3}\/\d{2}R\d{2})/g
    const tireSizeMatches = [...html.matchAll(tireSizeRegex)]
    const tireSizes = [...new Set(tireSizeMatches.map(m => m[1]))]

    return NextResponse.json({
      success: true,
      data: {
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year),
        bolt_count: parseInt(boltCount),
        bolt_spacing: parseFloat(boltSpacing),
        center_bore: centerBore,
        rim_sizes: rimSizes,
        tire_sizes: tireSizes,
        source_url: url
      }
    })

  } catch (error: any) {
    console.error('Scrape error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to scrape vehicle data'
    }, { status: 500 })
  }
}
