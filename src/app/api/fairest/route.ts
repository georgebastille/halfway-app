
import { NextRequest, NextResponse } from 'next/server';
import { MeetingPointResult, Journey } from '../../../lib/models';
import { calculateMeetingPoints } from '../../../lib/logic';
import { getStationMap } from '../../../lib/stations';
import { getTravelTimesFromStation } from '../../../lib/network';
import { toTitleCase } from '../../../lib/strings';

interface FairestRequestBody {
  stations: string[];
  fairnessWeight?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { stations: stationIds, fairnessWeight = 0.5 }: FairestRequestBody =
      await req.json();

    if (!stationIds || stationIds.length < 2) {
      return NextResponse.json(
        { error: 'Please provide at least two starting stations.' },
        { status: 400 },
      );
    }

    const stationMap = await getStationMap();

    const missingStations = stationIds.filter(
      (stationId) => !stationMap.has(stationId),
    );

    if (missingStations.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown station ids: ${missingStations.join(', ')}`,
        },
        { status: 400 },
      );
    }

    const travelTimes = await Promise.all(
      stationIds.map(async (stationId) =>
        getTravelTimesFromStation(stationId),
      ),
    );

    const aggregatedJourneys: Record<string, number[]> = {};
    const stationCount = stationIds.length;

    for (let idx = 0; idx < stationCount; idx += 1) {
      const timeMap = travelTimes[idx];

      for (const [destinationId, travelTime] of timeMap.entries()) {
        if (!aggregatedJourneys[destinationId]) {
          aggregatedJourneys[destinationId] = new Array<number>(stationCount).fill(
            Number.POSITIVE_INFINITY,
          );
        }

        aggregatedJourneys[destinationId][idx] = travelTime;
      }
    }

    const filteredJourneyData: Record<string, number[]> = {};

    for (const [destinationId, times] of Object.entries(aggregatedJourneys)) {
      if (!stationMap.has(destinationId)) {
        continue;
      }

      const hasCompleteCoverage = times.every(
        (time) => Number.isFinite(time) && time >= 0,
      );

      if (hasCompleteCoverage) {
        filteredJourneyData[destinationId] = times;
      }
    }

    if (Object.keys(filteredJourneyData).length === 0) {
      return NextResponse.json(
        {
          error:
            'No common meeting stations found for the provided starting points.',
        },
        { status: 404 },
      );
    }

    const calculatedResults = calculateMeetingPoints(
      filteredJourneyData,
      fairnessWeight,
    );

    const finalResults: MeetingPointResult[] = calculatedResults.map((result) => {
      const destinationStation = stationMap.get(result.station_code);
      const stationName = destinationStation
        ? toTitleCase(destinationStation.station_name)
        : 'Unknown';
      const journeys: Journey[] = stationIds.map((stationId, index) => {
        const originStation = stationMap.get(stationId);
        const originName = originStation
          ? toTitleCase(originStation.station_name)
          : stationId;
        return {
          from_station: originName,
          time: result.times[index],
        };
      });

      return {
        ...result,
        station_name: stationName,
        journeys,
      };
    });

    return NextResponse.json(finalResults);
  } catch (error: unknown) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
