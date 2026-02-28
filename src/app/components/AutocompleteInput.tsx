"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Fuse from "fuse.js";
import type { StationOption, StationSelection } from "../../lib/models";

interface AutocompleteInputProps {
  id: string;
  value: StationSelection;
  onChange: (value: StationSelection) => void;
  options: StationOption[];
}

export default function AutocompleteInput({
  id,
  value,
  onChange,
  options,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<StationOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(
    () => new Fuse(options, { keys: ["name"], threshold: 0.35 }),
    [options],
  );

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange({ id: null, name: newValue, latitude: null, longitude: null });

    if (newValue.length > 0) {
      setSuggestions(fuse.search(newValue, { limit: 10 }).map((r) => r.item));
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: StationOption) => {
    onChange({
      id: suggestion.id,
      name: suggestion.name,
      latitude: suggestion.latitude ?? null,
      longitude: suggestion.longitude ?? null,
    });
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        id={id}
        value={value.name}
        onChange={handleInputChange}
        placeholder="Enter station name"
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm text-sm text-slate-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none transition"
      />
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2.5 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {suggestion.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
