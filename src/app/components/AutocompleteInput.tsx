
'use client';

import { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';

interface AutocompleteInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  allStations: string[];
}

export default function AutocompleteInput({ id, value, onChange, allStations }: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fuseRef = useRef<Fuse<string> | null>(null);

  useEffect(() => {
    if (allStations.length > 0) {
      fuseRef.current = new Fuse(allStations, {
        threshold: 0.3,
        keys: [],
      });
    }
  }, [allStations]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (newValue && fuseRef.current) {
      const results = fuseRef.current.search(newValue);
      setSuggestions(results.map(result => result.item).slice(0, 10));
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
          {suggestions.map(suggestion => (
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
