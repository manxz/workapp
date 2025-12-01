import { NextRequest, NextResponse } from 'next/server';

// Places API requires an API key (not OAuth client ID)
// You can use the same API key that has Places API enabled
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

// Street suffix abbreviations
const STREET_ABBREVIATIONS: Record<string, string> = {
  'Lane': 'Ln.',
  'Boulevard': 'Blvd.',
  'Road': 'Rd.',
  'Street': 'St.',
  'Avenue': 'Ave.',
  'Drive': 'Dr.',
  'Court': 'Ct.',
  'Place': 'Pl.',
  'Circle': 'Cir.',
  'Highway': 'Hwy.',
  'Parkway': 'Pkwy.',
  'Terrace': 'Ter.',
  'Trail': 'Trl.',
  'Way': 'Way',
  'Square': 'Sq.',
  'Expressway': 'Expy.',
};

function formatAddress(address: string): string {
  if (!address) return '';
  
  let formatted = address;
  
  // Remove ", USA" or ", United States" from the end
  formatted = formatted.replace(/,\s*(USA|United States)$/i, '');
  
  // Abbreviate street suffixes (word boundary match)
  for (const [full, abbrev] of Object.entries(STREET_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    formatted = formatted.replace(regex, abbrev);
  }
  
  return formatted;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const input = searchParams.get('input');

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  if (!GOOGLE_API_KEY) {
    console.error('[Places API] No API key configured. Set GOOGLE_API_KEY in .env.local');
    return NextResponse.json({ predictions: [], error: 'API not configured' }, { status: 500 });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('key', GOOGLE_API_KEY);
    url.searchParams.set('types', 'geocode|establishment');

    const response = await fetch(url.toString());
    const data = await response.json();
    
    // Log errors from Google
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[Places API] Google API status:', data.status, data.error_message);
      return NextResponse.json({ predictions: [] });
    }
    
    // Return simplified predictions with formatted addresses
    const predictions = (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: formatAddress(p.description),
      mainText: formatAddress(p.structured_formatting?.main_text || p.description),
      secondaryText: formatAddress(p.structured_formatting?.secondary_text || ''),
    }));

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('[Places API] Error:', error);
    return NextResponse.json({ predictions: [] });
  }
}

