
export interface StationInput {
  stations: string[];
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
