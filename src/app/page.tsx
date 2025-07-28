'use client';

import { useState, useEffect, useCallback } from 'react';
import AutocompleteInput from './components/AutocompleteInput';
import { MeetingPointResult } from '../lib/models';

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
    <div className="container">
      <h1>Halfway</h1>

      <div id="station-inputs">
        {stationInputs.map((input, index) => (
          <div key={index} className="station-input-group">
            <label htmlFor={`station${index + 1}`}>Starting Point {index + 1}:</label>
            <AutocompleteInput
              id={`station${index + 1}`}
              value={input}
              onChange={(value) => handleStationChange(index, value)}
              allStations={allStations}
            />
          </div>
        ))}
      </div>
      <button onClick={addStationInput}>Add Another Starting Point</button>

      <div className="slider-group">
        <label htmlFor="fairness-slider">Fairness vs. Speed:</label>
        <input
          type="range"
          id="fairness-slider"
          min="0"
          max="4"
          step="1"
          value={fairnessSlider}
          onChange={handleSliderChange}
        />
        <span id="slider-value">{sliderValueText}</span>
      </div>

      <div id="results">
        <h2>Results:</h2>
        {isLoading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <ul id="results-list">
          {results.length > 0 ? (
            results.slice(0, 5).map(result => (
              <li key={result.station_code} className="result-card">
                <h3>{result.station_name}</h3>
                <div className="journeys-container">
                  {result.journeys.map(journey => (
                    <div key={journey.from_station} className="journey">
                      <span className="from">{journey.from_station}</span>
                      <span className="time">{journey.time} min</span>
                    </div>
                  ))}
                </div>
                <div className="stats">
                  <span>Avg: {result.mean_time.toFixed(1)}m</span>
                  <span>Unfairness: {result.variance.toFixed(1)}</span>
                </div>
              </li>
            ))
          ) : (
            !isLoading && !error && <li>No meeting points found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}