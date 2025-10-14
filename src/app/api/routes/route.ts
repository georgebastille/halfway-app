import { NextRequest, NextResponse } from "next/server";
import { getStationMap, type StationRecord } from "../../../lib/stations";
import {
  getRouteStepsBetweenStations,
  GROUND_LINE,
  type RouteStep,
} from "../../../lib/network";
import {
  type RouteDetails,
  type RouteSegment,
  type RouteStation,
  type RoutesResponse,
} from "../../../lib/models";
import { toTitleCase } from "../../../lib/strings";

interface RoutesRequestBody {
  origins: string[];
  destination: string;
}

function createStationCodeMap(stations: Iterable<StationRecord>): Map<string, StationRecord> {
  const codeMap = new Map<string, StationRecord>();
  for (const station of stations) {
    const code = station.code?.trim().toUpperCase();
    if (code && !codeMap.has(code)) {
      codeMap.set(code, station);
    }
  }
  return codeMap;
}

function resolveStationRecord(
  stationId: string,
  stationMap: Map<string, StationRecord>,
  stationCodeMap: Map<string, StationRecord>,
): StationRecord | undefined {
  const directRecord = stationMap.get(stationId);
  if (directRecord) {
    return directRecord;
  }

  if (stationId.startsWith("HUB") && stationId.length > 3) {
    const potentialCode = stationId.slice(3).toUpperCase();
    const codeRecord = stationCodeMap.get(potentialCode);
    if (codeRecord) {
      return codeRecord;
    }
  }

  return undefined;
}

function toRouteStation(
  stationId: string,
  stationMap: Map<string, StationRecord>,
  stationCodeMap: Map<string, StationRecord>,
): RouteStation {
  const record = resolveStationRecord(stationId, stationMap, stationCodeMap);
  if (!record) {
    return {
      station_id: stationId,
      station_name: stationId,
      latitude: null,
      longitude: null,
    };
  }

  const latitude = record.latitude ?? null;
  const longitude = record.longitude ?? null;

  return {
    station_id: record.station_id,
    station_name: toTitleCase(record.station_name),
    latitude,
    longitude,
  };
}

function isOperationalLine(line: string) {
  return line !== GROUND_LINE && line !== "HUB";
}

function extractSegmentLine(current: RouteStep, next: RouteStep) {
  if (isOperationalLine(next.line)) {
    return next.line;
  }
  if (isOperationalLine(current.line)) {
    return current.line;
  }
  return next.line ?? current.line;
}

function buildSegments(
  steps: RouteStep[],
  stationMap: Map<string, StationRecord>,
  stationCodeMap: Map<string, StationRecord>,
): { segments: RouteSegment[]; interchangeIds: Set<string> } {
  const segments: RouteSegment[] = [];
  const interchangeIds = new Set<string>();
  let previousOperationalLine: string | null = null;

  for (let idx = 0; idx < steps.length - 1; idx += 1) {
    const current = steps[idx];
    const next = steps[idx + 1];

    if (current.stationId === next.stationId) {
      continue;
    }

    const line = extractSegmentLine(current, next);
    const travelTime = next.cumulativeTime - current.cumulativeTime;
    if (!Number.isFinite(travelTime) || travelTime < 0) {
      continue;
    }

    const fromStation = toRouteStation(current.stationId, stationMap, stationCodeMap);
    const toStation = toRouteStation(next.stationId, stationMap, stationCodeMap);

    segments.push({
      from: fromStation,
      to: toStation,
      line,
      time: travelTime,
    });

    const normalizedLine = isOperationalLine(line) ? line : null;
    if (
      previousOperationalLine &&
      normalizedLine &&
      normalizedLine !== previousOperationalLine
    ) {
      interchangeIds.add(current.stationId);
    }

    if (normalizedLine) {
      previousOperationalLine = normalizedLine;
    }
  }

  return { segments, interchangeIds };
}

export async function POST(req: NextRequest) {
  try {
    const { origins, destination }: RoutesRequestBody = await req.json();

    if (!destination) {
      return NextResponse.json(
        { error: "Destination station is required." },
        { status: 400 },
      );
    }

    if (!origins || origins.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one origin station." },
        { status: 400 },
      );
    }

    const uniqueOrigins = [...new Set(origins)];
    const stationMap = await getStationMap();
    const stationCodeMap = createStationCodeMap(stationMap.values());

    if (!stationMap.has(destination)) {
      return NextResponse.json(
        { error: `Unknown destination station: ${destination}` },
        { status: 400 },
      );
    }

    const destinationStation = toRouteStation(destination, stationMap, stationCodeMap);
    const routes: RouteDetails[] = [];

    for (const origin of uniqueOrigins) {
      if (!stationMap.has(origin)) {
        return NextResponse.json(
          { error: `Unknown origin station: ${origin}` },
          { status: 400 },
        );
      }

      const { steps, totalTime } = await getRouteStepsBetweenStations(origin, destination);
      const { segments, interchangeIds } = buildSegments(steps, stationMap, stationCodeMap);

      const interchangePoints: RouteStation[] = [...interchangeIds].map((stationId) =>
        toRouteStation(stationId, stationMap, stationCodeMap),
      );

      routes.push({
        origin: toRouteStation(origin, stationMap, stationCodeMap),
        destination: destinationStation,
        total_time: totalTime,
        segments,
        interchange_points: interchangePoints,
      });
    }

    const response: RoutesResponse = {
      destination: destinationStation,
      routes,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
