
import { NextRequest, NextResponse } from 'next/server';
import { MeetingPointResult, Journey } from '../../../lib/models';
import { calculateMeetingPoints } from '../../../lib/logic';
import { getDb } from '../../../lib/db';

interface JourneyRow {
  STATIONA: string;
  STATIONB: string;
  WEIGHT: number;
  STATIONB_NAME: string;
}

export async function POST(req: NextRequest) {
  try {
    const { stations: stationNames, fairnessWeight = 0.5 }: { stations: string[], fairnessWeight: number } = await req.json();

    if (!stationNames || stationNames.length < 2) {
      return NextResponse.json({ error: 'Please provide at least two starting stations.' }, { status: 400 });
    }

    const db = getDb();

    // 1. Get station codes for the input station names
    const getCodeStmt = db.prepare('SELECT CODE FROM STATIONS WHERE NAME = ?');
    const stationCodes = stationNames.map(name => {
      const row = getCodeStmt.get(name) as { CODE: string };
      if (!row) {
        throw new Error(`Station not found: ${name}`);
      }
      return row.CODE;
    });

    // 2. Construct and execute the query to get journey data
    const placeholders = stationCodes.map(() => '?').join(',');
    const query = `
      SELECT
          FR.STATIONA,
          FR.STATIONB,
          FR.WEIGHT,
          S.NAME AS STATIONB_NAME
      FROM
          FULLROUTES AS FR
      JOIN
          STATIONS AS S ON FR.STATIONB = S.CODE
      WHERE
          FR.STATIONA IN (${placeholders})
    `;

    const allJourneyRows = db.prepare(query).all(...stationCodes) as JourneyRow[];

    const journeyData: { [key: string]: { [key: string]: number } } = {};
    const stationNamesMap: { [key: string]: string } = {};

    for (const row of allJourneyRows) {
      const { STATIONA, STATIONB, WEIGHT, STATIONB_NAME } = row;
      if (!journeyData[STATIONB]) {
        journeyData[STATIONB] = {};
      }
      journeyData[STATIONB][STATIONA] = WEIGHT;
      stationNamesMap[STATIONB] = STATIONB_NAME;
    }

    // 3. Filter and structure data for calculation
    const filteredJourneyData: { [key: string]: number[] } = {};
    for (const stationBCode in journeyData) {
      const journeys = journeyData[stationBCode];
      if (Object.keys(journeys).length === stationCodes.length) {
        const orderedTimes = stationCodes.map(code => journeys[code]);
        if (orderedTimes.every(t => t !== undefined)) {
            filteredJourneyData[stationBCode] = orderedTimes;
        }
      }
    }

    // 4. Calculate meeting points
    const calculatedResults = calculateMeetingPoints(filteredJourneyData, fairnessWeight);

    // 5. Format final results
    const finalResults: MeetingPointResult[] = calculatedResults.map(result => {
      const stationName = stationNamesMap[result.station_code] || 'Unknown';
      const journeys: Journey[] = stationNames.map((startStation, i) => ({
        from_station: startStation,
        time: result.times[i],
      }));
      return {
        ...result,
        station_name: stationName,
        journeys,
      };
    });

    return NextResponse.json(finalResults);

  } catch (error: unknown) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
