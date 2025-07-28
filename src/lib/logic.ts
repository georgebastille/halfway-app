
interface JourneyData {
  [station_code: string]: number[];
}

interface CalculationResult {
  station_code: string;
  mean_time: number;
  variance: number;
  score: number;
  times: number[];
}

// Basic statistics functions
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[], meanValue: number): number {
  return arr.reduce((a, b) => a + Math.pow(b - meanValue, 2), 0) / arr.length;
}

export function calculateMeetingPoints(
  journeyData: JourneyData,
  fairnessWeight: number
): CalculationResult[] {
  const results: CalculationResult[] = [];

  for (const stationCode in journeyData) {
    const times = journeyData[stationCode];
    if (times && times.length > 0) {
      const meanTime = mean(times);
      const varianceValue = variance(times, meanTime);

      // Combine mean and variance into a single score
      const score = (1 - fairnessWeight) * meanTime + fairnessWeight * varianceValue;

      results.push({
        station_code: stationCode,
        mean_time: meanTime,
        variance: varianceValue,
        score: score,
        times: times,
      });
    }
  }

  // Sort results by score (lowest score is best)
  results.sort((a, b) => a.score - b.score);

  return results;
}
