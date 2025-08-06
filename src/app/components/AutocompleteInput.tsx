"use client";

import { useState, useEffect, useRef } from "react";

interface AutocompleteInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  allStations: string[];
}

export default function AutocompleteInput({
  id,
  value,
  onChange,
  allStations,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fuzzyMatch = (query: string, stations: string[]): string[] => {
    if (!query || query.length === 0) return [];

    const normalizedQuery = query.toLowerCase().trim();
    const matches: { station: string; score: number }[] = [];

    stations.forEach((station) => {
      const normalizedStation = station.toLowerCase();
      let score = 0;

      // Exact match (highest priority)
      if (normalizedStation === normalizedQuery) {
        score = 1000;
      }
      // Starts with query (high priority)
      else if (normalizedStation.startsWith(normalizedQuery)) {
        score = 900;
      }
      // Contains query as substring (medium priority)
      else if (normalizedStation.includes(normalizedQuery)) {
        score = 800;
      }
      // Acronym matching - check if query matches first letters of words
      else {
        const words = normalizedStation.split(/[\s\-']+/); // Split on spaces, hyphens, and apostrophes
        const acronym = words.map((word) => word.charAt(0)).join("");

        if (acronym.startsWith(normalizedQuery)) {
          score = 700;
        }
        // Partial acronym matching
        else if (normalizedQuery.length >= 2) {
          let acronymMatch = true;
          let wordIndex = 0;

          for (let i = 0; i < normalizedQuery.length; i++) {
            const char = normalizedQuery[i];
            let found = false;

            // Look for this character as the start of a word
            for (let j = wordIndex; j < words.length; j++) {
              if (words[j].charAt(0) === char) {
                wordIndex = j + 1;
                found = true;
                break;
              }
            }

            if (!found) {
              acronymMatch = false;
              break;
            }
          }

          if (acronymMatch) {
            score = 600;
          }
        }

        // Fuzzy character matching (lowest priority)
        if (score === 0) {
          let queryIndex = 0;
          let matchedChars = 0;

          for (
            let i = 0;
            i < normalizedStation.length && queryIndex < normalizedQuery.length;
            i++
          ) {
            if (normalizedStation[i] === normalizedQuery[queryIndex]) {
              matchedChars++;
              queryIndex++;
            }
          }

          // If we matched at least 70% of the query characters in order
          if (matchedChars >= Math.ceil(normalizedQuery.length * 0.7)) {
            score = Math.floor((matchedChars / normalizedQuery.length) * 500);
          }
        }
      }

      // Boost score for shorter station names (more likely to be exact matches)
      if (score > 0) {
        const lengthBonus = Math.max(0, 50 - station.length);
        score += lengthBonus;
      }

      if (score > 0) {
        matches.push({ station, score });
      }
    });

    // Sort by score (descending) and return top 10
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((match) => match.station);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (newValue && newValue.length > 0) {
      const results = fuzzyMatch(newValue, allStations);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        id={id}
        value={value}
        onChange={handleInputChange}
        placeholder="Enter station name"
        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
      />
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
