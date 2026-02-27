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
} from "@heroicons/react/24/outline";

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
    <div className="min-h-screen text-gray-800">
      {/* Mobile title - only visible when sidebar is closed */}
      <header className="lg:hidden bg-white border-b border-gray-200 py-6 px-4 pt-20 pb-12 overflow-visible">
        <div className="text-center overflow-visible">
          <h1
            className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400 overflow-visible"
            style={{ lineHeight: "1.3" }}
          >
            Halfway
          </h1>
        </div>
      </header>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 pt-4 lg:pt-8">
        <main className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-700">
              <UserGroupIcon className="h-6 w-6 mr-3" />
              Starting Points
            </h2>

            <div id="station-inputs" className="space-y-4 mb-6">
              {stationInputs.map((input, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <label
                    htmlFor={`station${index + 1}`}
                    className="text-gray-600 w-28"
                  >
                    Station {index + 1}:
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
              className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Another Starting Point
            </button>

          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-700">
              <MapIcon className="h-6 w-6 mr-3" />
              Journey Map
            </h2>
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

          <div id="results" className="mt-10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-700">
              <MapPinIcon className="h-6 w-6 mr-3" />
              Top 5 Stations to Meet at:
            </h2>
            {isLoading && (
              <p className="text-center">Finding the best spots...</p>
            )}
            {error && <p className="text-center text-red-500">{error}</p>}
            <ul className="space-y-4">
              {results.length > 0
                ? results.slice(0, 5).map((result) => {
                    const isSelected =
                      selectedDestinationId === result.station_code;
                    const baseClasses =
                      "bg-white rounded-lg p-5 transition border focus:outline-none";
                    const stateClasses = isSelected
                      ? "border-blue-500 shadow-lg ring-1 ring-blue-200"
                      : "border-transparent shadow-md hover:shadow-lg cursor-pointer";
                    const cardClasses = `${baseClasses} ${stateClasses}`;
                    const isCurrentRoutesLoaded =
                      routesData?.destination.station_id === result.station_code;
                    const isFetchingRoutesForSelection =
                      isRoutesLoading && selectedDestinationId === result.station_code;

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
                        <h3 className="text-xl font-bold text-blue-600">
                          {result.station_name}
                        </h3>
                        <div className="mt-4 space-y-2">
                          {result.journeys.map((journey) => (
                            <div
                              key={journey.from_station}
                              className="flex justify-between items-center text-gray-700"
                            >
                              <span className="font-medium">
                                {journey.from_station}
                              </span>
                              <span className="text-lg font-semibold">
                                {journey.time} min
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between text-gray-500 text-sm">
                          <span>Avg: {result.mean_time.toFixed(1)}m</span>
                          <span>Unfairness: {result.variance.toFixed(1)}</span>
                        </div>
                        {isSelected && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                Routes from your starting points
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
