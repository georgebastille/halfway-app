
import { NextResponse } from 'next/server';
import { getStationOptions } from '../../../lib/stations';

export async function GET() {
  try {
    const stations = await getStationOptions();
    return NextResponse.json(stations);
  } catch (error: unknown) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
