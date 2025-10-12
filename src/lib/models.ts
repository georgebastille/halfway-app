
export interface StationOption {
  id: string;
  name: string;
}

export interface StationSelection {
  id: string | null;
  name: string;
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
