
import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

interface StationRow {
  NAME: string;
}

export function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT NAME FROM Stations');
    const stations = (stmt.all() as StationRow[]).map((station) => station.NAME);
    return NextResponse.json(stations);
  } catch (error: unknown) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
