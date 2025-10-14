import { readJsonLines } from './jsonl';
import { getGroundStationIds } from './network';
import type { StationOption } from './models';
import { toTitleCase } from './strings';

export interface StationRecord {
  station_id: string;
  station_name: string;
  code?: string;
  latitude?: number | null;
  longitude?: number | null;
  tiploc?: string;
  atco_code?: string;
  locality?: string;
}

let stationCache: StationRecord[] | null = null;
let stationMapCache: Map<string, StationRecord> | null = null;

async function loadStations(): Promise<StationRecord[]> {
  if (!stationCache) {
    stationCache = await readJsonLines<StationRecord>('src/data/stations.jsonl');
  }
  return stationCache;
}

export async function getStations(): Promise<StationRecord[]> {
  return loadStations();
}

export async function getStationMap(): Promise<Map<string, StationRecord>> {
  if (!stationMapCache) {
    const stations = await loadStations();
    stationMapCache = new Map(stations.map((station) => [station.station_id, station]));
  }
  return stationMapCache;
}

export async function getStationOptions(): Promise<StationOption[]> {
  const [stations, groundStationIds] = await Promise.all([
    loadStations(),
    getGroundStationIds(),
  ]);

  return stations
    .filter((station) => groundStationIds.has(station.station_id))
    .map((station) => ({
      id: station.station_id,
      name: toTitleCase(station.station_name),
      latitude: station.latitude ?? null,
      longitude: station.longitude ?? null,
    }));
}
