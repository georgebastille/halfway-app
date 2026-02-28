"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AutocompleteInput from "./components/AutocompleteInput";
import type {
  MeetingPointResult,
  StationOption,
  StationSelection,
  RouteStation,
  RoutesResponse,
} from "../lib/models";
import MapView from "./components/MapView";
import {
  UserGroupIcon,
  PlusCircleIcon,
  MapPinIcon,
  MapIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

const VENUE_TYPES = [
  { value: "pubs", label: "Pubs" },
  { value: "restaurants", label: "Restaurants" },
  { value: "cafes", label: "Cafes" },
  { value: "bars", label: "Bars" },
  { value: "parks", label: "Parks" },
  { value: "things to do", label: "Things to do" },
];

function buildNearbyUrl(
  venueType: string,
  stationName: string,
  lat?: number | null,
  lng?: number | null,
): string {
  if (lat && lng) {
    return `https://www.google.com/maps/search/${encodeURIComponent(venueType)}/@${lat},${lng},16z`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueType + " near " + stationName + ", London")}`;
}

export default function Home() {
  const createEmptySelection = (): StationSelection => ({
    id: null,
    name: "",
    latitude: null,
    longitude: null,
  });
  const [stationInputs, setStationInputs] = useState<StationSelection[]>([
    createEmptySelection(),
    createEmptySelection(),
  ]);
  const [stationOptions, setStationOptions] = useState<StationOption[]>([]);
  const [results, setResults] = useState<MeetingPointResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [routesData, setRoutesData] = useState<RoutesResponse | null>(null);
  const [isRoutesLoading, setIsRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [selectedVenueType, setSelectedVenueType] = useState("pubs");
  const pendingDestinationRef = useRef<string | null>(null);
  const urlInitialized = useRef(false);

  useEffect(() => {
    fetch("/api/stations")
      .then((res) => res.json())
      .then((data: StationOption[]) => setStationOptions(data))
      .catch((err) => console.error("Failed to fetch stations:", err));
  }, []);

  // Restore station selections from URL query params once station options are loaded.
  // Must run before the URL-sync effect starts writing, hence the urlInitialized gate.
  useEffect(() => {
    if (stationOptions.length === 0 || urlInitialized.current) return;

    const ids = new URLSearchParams(window.location.search).getAll("s");
    if (ids.length > 0) {
      const selections = ids.map((id) => {
        const opt = stationOptions.find((o) => o.id === id);
        return opt
          ? { id: opt.id, name: opt.name, latitude: opt.latitude ?? null, longitude: opt.longitude ?? null }
          : createEmptySelection();
      });
      while (selections.length < 2) selections.push(createEmptySelection());
      setStationInputs(selections);
    }

    urlInitialized.current = true;
  }, [stationOptions]);

  const handleStationChange = (index: number, value: StationSelection) => {
    setStationInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setSelectedDestinationId(null);
    setRoutesData(null);
    setRoutesError(null);
    pendingDestinationRef.current = null;
  };

  const addStationInput = () => {
    setStationInputs((prev) => [...prev, createEmptySelection()]);
    setSelectedDestinationId(null);
    setRoutesData(null);
    setRoutesError(null);
    pendingDestinationRef.current = null;
  };

  type StationSelectionWithId = StationSelection & { id: string };

  const fetchMeetingPoints = useCallback(async () => {
    const validSelections = stationInputs.filter(
      (selection): selection is StationSelectionWithId =>
        typeof selection.id === "string" && selection.id.length > 0,
    );
    if (validSelections.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fairnessWeight = 0.55; // Fixed at balanced (middle) position
      const response = await fetch("/api/fairest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stations: validSelections.map((selection) => selection.id),
          fairnessWeight,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch results");
      }

      const data: MeetingPointResult[] = await response.json();
      setResults(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [stationInputs]);

  useEffect(() => {
    const debounceTimer = setTimeout(fetchMeetingPoints, 500);
    return () => clearTimeout(debounceTimer);
  }, [fetchMeetingPoints]);

  // Keep the URL in sync with current station selections so the search is shareable.
  // Skipped until urlInitialized is true to avoid clobbering URL params on first render.
  useEffect(() => {
    if (!urlInitialized.current) return;
    const params = new URLSearchParams();
    stationInputs.forEach((s) => {
      if (s.id) params.append("s", s.id);
    });
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [stationInputs]);

  // Reset selected destination if it's no longer in results
  useEffect(() => {
    if (
      selectedDestinationId &&
      results.length > 0 &&
      !results.some((r) => r.station_code === selectedDestinationId)
    ) {
      setSelectedDestinationId(null);
      setRoutesData(null);
      setRoutesError(null);
      pendingDestinationRef.current = null;
    }
  }, [results, selectedDestinationId]);

  const fetchRoutesForDestination = useCallback(
    async (destinationId: string) => {
      const validSelections = stationInputs.filter(
        (selection): selection is StationSelectionWithId =>
          typeof selection.id === "string" && selection.id.length > 0,
      );

      if (validSelections.length === 0) {
        if (pendingDestinationRef.current === destinationId) {
          setRoutesError(
            "Please select at least one valid starting station before viewing routes.",
          );
          setIsRoutesLoading(false);
        }
        return;
      }

      if (pendingDestinationRef.current === destinationId) {
        setIsRoutesLoading(true);
      }

      try {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origins: validSelections.map((selection) => selection.id),
            destination: destinationId,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Failed to fetch routes";
          try {
            const errData = await response.json();
            if (errData?.error) {
              errorMessage = errData.error;
            }
          } catch {
            // Ignore JSON parse errors
          }
          throw new Error(errorMessage);
        }

        const data: RoutesResponse = await response.json();

        if (pendingDestinationRef.current === destinationId) {
          setRoutesData(data);
          setRoutesError(null);
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        if (pendingDestinationRef.current === destinationId) {
          setRoutesError(errorMessage);
          setRoutesData(null);
        }
      } finally {
        if (pendingDestinationRef.current === destinationId) {
          setIsRoutesLoading(false);
        }
      }
    },
    [stationInputs],
  );

  const handleDestinationSelect = (stationCode: string) => {
    if (stationCode === selectedDestinationId && routesData) {
      return;
    }
    pendingDestinationRef.current = stationCode;
    setSelectedDestinationId(stationCode);
    setRoutesData(null);
    setRoutesError(null);
    void fetchRoutesForDestination(stationCode);
  };

  const selectedDestinationOption = selectedDestinationId
    ? stationOptions.find((option) => option.id === selectedDestinationId)
    : null;

  const mapDestination: RouteStation | null =
    routesData?.destination ??
    (selectedDestinationOption
      ? {
          station_id: selectedDestinationOption.id,
          station_name: selectedDestinationOption.name,
          latitude: selectedDestinationOption.latitude ?? null,
          longitude: selectedDestinationOption.longitude ?? null,
        }
      : null);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      {/* Mobile title - only visible when sidebar is closed */}
      <header className="lg:hidden bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 pt-16 pb-5">
        <h1
          className="text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400"
          style={{ lineHeight: "1.3" }}
        >
          Halfway
        </h1>
      </header>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 pt-4 lg:pt-8">
        <main className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
              <UserGroupIcon className="h-4 w-4" />
              Starting Points
            </p>

            <div id="station-inputs" className="space-y-3 mb-5">
              {stationInputs.map((input, index) => (
                <div key={index} className="flex items-center gap-3">
                  <label
                    htmlFor={`station${index + 1}`}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-semibold"
                  >
                    {index + 1}
                  </label>
                  <AutocompleteInput
                    id={`station${index + 1}`}
                    value={input}
                    onChange={(value) => handleStationChange(index, value)}
                    options={stationOptions}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addStationInput}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:border-gray-300 transition text-sm"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Add another person
            </button>

          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
              <MapIcon className="h-4 w-4" />
              Journey Map
            </p>
            <MapView
              origins={stationInputs}
              destination={mapDestination}
              routes={routesData?.routes ?? null}
              isLoadingRoutes={isRoutesLoading}
            />
            <div className="mt-3 text-sm text-gray-600">
              {routesError ? (
                <p className="text-red-500">{routesError}</p>
              ) : selectedDestinationId ? (
                isRoutesLoading ? (
                  <p>Plotting the journeys...</p>
                ) : routesData ? (
                  <p>
                    Showing routes from each starting point to{" "}
                    <span className="font-semibold">
                      {routesData.destination.station_name}
                    </span>
                    .
                  </p>
                ) : (
                  <p>Routes will appear here once they are ready.</p>
                )
              ) : (
                <p>
                  Add at least two starting stations, then choose a meeting
                  point to see the routes.
                </p>
              )}
            </div>
          </div>

          <div id="results" className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              Best meeting points
            </p>
            {isLoading && (
              <p className="text-center">Finding the best spots...</p>
            )}
            {error && <p className="text-center text-red-500">{error}</p>}
            <ul className="space-y-3">
              {results.length > 0
                ? results.slice(0, 5).map((result) => {
                    const isSelected =
                      selectedDestinationId === result.station_code;
                    const baseClasses =
                      "bg-white rounded-2xl p-5 transition border focus:outline-none cursor-pointer";
                    const stateClasses = isSelected
                      ? "border-blue-300 shadow-md ring-2 ring-blue-100"
                      : "border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200";
                    const cardClasses = `${baseClasses} ${stateClasses}`;
                    const isCurrentRoutesLoaded =
                      routesData?.destination.station_id === result.station_code;
                    const isFetchingRoutesForSelection =
                      isRoutesLoading && selectedDestinationId === result.station_code;

                    const stationOpt = stationOptions.find(
                      (o) => o.id === result.station_code,
                    );

                    return (
                      <li
                        key={result.station_code}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() =>
                          handleDestinationSelect(result.station_code)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleDestinationSelect(result.station_code);
                          }
                        }}
                        className={cardClasses}
                      >
                        <h3 className="text-lg font-semibold text-slate-800">
                          {result.station_name}
                        </h3>
                        <div className="mt-3 space-y-1.5">
                          {result.journeys.map((journey) => (
                            <div
                              key={journey.from_station}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm text-gray-500">
                                {journey.from_station}
                              </span>
                              <span className="text-sm font-semibold text-slate-700">
                                {journey.time} min
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full">
                            {result.mean_time.toFixed(0)} min avg
                          </span>
                        </div>
                        {isSelected && (
                          <div className="mt-4 border-t border-gray-100 pt-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                Routes
                              </h4>
                              {isRoutesLoading && (
                                <span className="text-xs text-gray-500">Loading...</span>
                              )}
                            </div>
                            {routesError ? (
                              <p className="mt-2 text-sm text-red-500">{routesError}</p>
                            ) : isCurrentRoutesLoaded && routesData?.routes.length ? (
                              <div className="mt-3 overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                  <thead className="text-xs uppercase text-gray-500">
                                    <tr>
                                      <th className="pb-2 pr-3 font-semibold">Start</th>
                                      <th className="pb-2 pr-3 font-semibold">Route</th>
                                      <th className="pb-2 font-semibold text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {routesData.routes.map((route, routeIndex) => {
                                      const stops = [
                                        route.origin.station_name,
                                        ...route.interchange_points.map(
                                          (point) => point.station_name,
                                        ),
                                        routesData.destination.station_name,
                                      ];

                                      return (
                                        <tr key={`${route.origin.station_id}-${routeIndex}`}>
                                          <td className="py-2 pr-3 font-medium text-gray-800">
                                            {route.origin.station_name}
                                          </td>
                                          <td className="py-2 pr-3 text-gray-700">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              {stops.map((stop, stopIndex) => (
                                                <span
                                                  key={`${stop}-${stopIndex}`}
                                                  className="inline-flex items-center"
                                                >
                                                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                                                    {stop}
                                                  </span>
                                                  {stopIndex < stops.length - 1 && (
                                                    <span className="mx-1 text-[10px] text-gray-400">
                                                      {"->"}
                                                    </span>
                                                  )}
                                                </span>
                                              ))}
                                            </div>
                                          </td>
                                          <td className="py-2 text-right text-gray-800">
                                            {route.total_time} min
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : isFetchingRoutesForSelection ? (
                              <p className="mt-2 text-sm text-gray-600">
                                Fetching routes for this meeting point...
                              </p>
                            ) : (
                              <p className="mt-2 text-sm text-gray-600">
                                Select at least two starting stations to see the step-by-step routes.
                              </p>
                            )}
                            <div
                              className="mt-4 pt-4 border-t border-gray-200"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-gray-600">Show me</span>
                                <select
                                  value={selectedVenueType}
                                  onChange={(e) => setSelectedVenueType(e.target.value)}
                                  className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                >
                                  {VENUE_TYPES.map((vt) => (
                                    <option key={vt.value} value={vt.value}>
                                      {vt.label}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-sm text-gray-600">nearby</span>
                                <a
                                  href={buildNearbyUrl(
                                    selectedVenueType,
                                    result.station_name,
                                    stationOpt?.latitude,
                                    stationOpt?.longitude,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                                >
                                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                  Open in Maps
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })
                : !isLoading &&
                  !error && (
                    <li className="text-center text-gray-500">
                      No meeting points found. Try different stations.
                    </li>
                  )}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
