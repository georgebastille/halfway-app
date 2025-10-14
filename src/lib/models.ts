
export interface StationOption {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface StationSelection {
  id: string | null;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Journey {
  from_station: string;
  time: number;
}

export interface MeetingPointResult {
  station_code: string;
  station_name: string;
  mean_time: number;
  variance: number;
  score: number;
  journeys: Journey[];
  times: number[];
}

export interface RouteStation {
  station_id: string;
  station_name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface RouteSegment {
  from: RouteStation;
  to: RouteStation;
  line: string;
  time: number;
}

export interface RouteDetails {
  origin: RouteStation;
  destination: RouteStation;
  total_time: number;
  segments: RouteSegment[];
  interchange_points: RouteStation[];
}

export interface RoutesResponse {
  destination: RouteStation;
  routes: RouteDetails[];
}
