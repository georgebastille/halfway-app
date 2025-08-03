'use client';

import { useState, useEffect, useCallback } from 'react';
import AutocompleteInput from './components/AutocompleteInput';
import { MeetingPointResult } from '../lib/models';
import { UserGroupIcon, ClockIcon, PlusCircleIcon, MapPinIcon } from '@heroicons/react/24/outline';


export default function Home() {
  const [stationInputs, setStationInputs] = useState<string[]>(['', '']);
  const [allStations, setAllStations] = useState<string[]>([]);
  const [fairnessSlider, setFairnessSlider] = useState(2);
  const [sliderValueText, setSliderValueText] = useState('Balanced');
  const [results, setResults] = useState<MeetingPointResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stations')
      .then(res => res.json())
      .then(data => setAllStations(data))
      .catch(err => console.error('Failed to fetch stations:', err));
  }, []);

  const handleStationChange = (index: number, value: string) => {
    const newInputs = [...stationInputs];
    newInputs[index] = value;
    setStationInputs(newInputs);
  };

  const addStationInput = () => {
    setStationInputs([...stationInputs, '']);
  };

  const updateSliderText = (value: number) => {
    const textMap = ['Fastest', 'Leaning Towards Fastest', 'Balanced', 'Leaning Towards Fairest', 'Fairest'];
    setSliderValueText(textMap[value]);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFairnessSlider(value);
    updateSliderText(value);
  };

  const fetchMeetingPoints = useCallback(async () => {
    const validStations = stationInputs.filter(s => s.trim() !== '' && allStations.includes(s));
    if (validStations.length < 2) {
      setResults([]);
      setError('Please enter at least two valid station names.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fairnessWeight = (fairnessSlider / 4) * 0.9 + 0.1;
      const response = await fetch('/api/fairest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stations: validStations, fairnessWeight }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch results');
      }

      const data: MeetingPointResult[] = await response.json();
      setResults(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [stationInputs, fairnessSlider, allStations]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
        fetchMeetingPoints();
    }, 500); // Debounce API calls

    return () => clearTimeout(debounceTimer);
  }, [fetchMeetingPoints]);


  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">
            Halfway
          </h1>
          <p className="text-gray-600 mt-2">Find the perfect meeting spot in London</p>
        </header>

        <main className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-700">
              <UserGroupIcon className="h-6 w-6 mr-3" />
              Starting Points
            </h2>

            <div id="station-inputs" className="space-y-4 mb-6">
              {stationInputs.map((input, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <label htmlFor={`station${index + 1}`} className="text-gray-600 w-28">
                    Station {index + 1}:
                  </label>
                  <AutocompleteInput
                    id={`station${index + 1}`}
                    value={input}
                    onChange={(value) => handleStationChange(index, value)}
                    allStations={allStations}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addStationInput}
              className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Another Starting Point
            </button>

            <div className="mt-8">
              <label htmlFor="fairness-slider" className="flex items-center text-lg font-medium mb-3 text-gray-700">
                <ClockIcon className="h-6 w-6 mr-3" />
                Fairness vs. Speed
              </label>
              <input
                type="range"
                id="fairness-slider"
                min="0"
                max="4"
                step="1"
                value={fairnessSlider}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-center text-gray-600 mt-2" id="slider-value">
                {sliderValueText}
              </div>
            </div>
          </div>

          <div id="results" className="mt-10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-700">
              <MapPinIcon className="h-6 w-6 mr-3" />
              Top 5 Stations to Meet at:
            </h2>
            {isLoading && <p className="text-center">Finding the best spots...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
            <ul className="space-y-4">
              {results.length > 0 ? (
                results.slice(0, 5).map(result => (
                  <li key={result.station_code} className="bg-white rounded-lg shadow-md p-5 transition hover:shadow-lg">
                    <h3 className="text-xl font-bold text-blue-600">{result.station_name}</h3>
                    <div className="mt-4 space-y-2">
                      {result.journeys.map(journey => (
                        <div key={journey.from_station} className="flex justify-between items-center text-gray-700">
                          <span className="font-medium">{journey.from_station}</span>
                          <span className="text-lg font-semibold">{journey.time} min</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between text-gray-500 text-sm">
                      <span>Avg: {result.mean_time.toFixed(1)}m</span>
                      <span>Unfairness: {result.variance.toFixed(1)}</span>
                    </div>
                  </li>
                ))
              ) : (
                !isLoading && !error && <li className="text-center text-gray-500">No meeting points found. Try different stations.</li>
              )}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
