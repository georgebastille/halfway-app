"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import type {
  RouteDetails,
  RouteSegment,
  RouteStation,
  StationSelection,
} from "../../lib/models";

interface MapViewProps {
  origins: StationSelection[];
  destination: RouteStation | null;
  routes: RouteDetails[] | null;
  isLoadingRoutes: boolean;
}

type Coordinate = [number, number];

type MapLibreWithWorker = typeof maplibregl & {
  workerClass?: typeof Worker;
};

const DEFAULT_CENTER: Coordinate = [-2.5, 54.0];
const DEFAULT_ZOOM = 5;
const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const lineColorMap: Record<string, string> = {
  bakerloo: "#B26300",
  central: "#DC241F",
  circle: "#FFD300",
  district: "#00782A",
  "hammersmith-city": "#F4A9BE",
  jubilee: "#868F98",
  metropolitan: "#9B0058",
  northern: "#000000",
  piccadilly: "#0019A8",
  victoria: "#00A0E2",
  "waterloo-city": "#76D0BD",
  overground: "#E86A10",
  tram: "#00BD19",
  elizabeth: "#6950A1",
  dlr: "#00A4A7",
  lioness: "#F97316",
  HUB: "#94A3B8",
  GROUND: "#64748B",
  transfer: "#64748B",
};

function hasValidCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): latitude is number & typeof longitude {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  );
}

function segmentHasCoordinates(segment: RouteSegment): boolean {
  return (
    hasValidCoordinates(segment.from.latitude, segment.from.longitude) &&
    hasValidCoordinates(segment.to.latitude, segment.to.longitude)
  );
}

function routeStationHasCoordinates(station: RouteStation): boolean {
  return hasValidCoordinates(station.latitude, station.longitude);
}

function selectionHasCoordinates(selection: StationSelection): selection is StationSelection & {
  latitude: number;
  longitude: number;
} {
  return hasValidCoordinates(selection.latitude ?? null, selection.longitude ?? null);
}

function toFeatureCollection(
  features: GeoJSON.Feature[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features,
  };
}

function stringToColor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

function getLineColor(line: string) {
  const key = line.toLowerCase();
  if (lineColorMap[key]) {
    return lineColorMap[key];
  }
  return stringToColor(key);
}

function buildRouteFeatures(routes: RouteDetails[] | null) {
  if (!routes || routes.length === 0) {
    return {
      lineFeatures: EMPTY_FEATURE_COLLECTION,
      changeFeatures: EMPTY_FEATURE_COLLECTION,
    };
  }

  const lineFeatures: GeoJSON.Feature[] = [];
  const changeFeatures: GeoJSON.Feature[] = [];

  routes.forEach((route, originIndex) => {
    route.segments.forEach((segment, segmentIndex) => {
      if (!segmentHasCoordinates(segment)) {
        return;
      }

      const color = getLineColor(segment.line);
      lineFeatures.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [segment.from.longitude as number, segment.from.latitude as number],
            [segment.to.longitude as number, segment.to.latitude as number],
          ],
        },
        properties: {
          color,
          line: segment.line,
          originIndex,
          segmentIndex,
        },
      });
    });

    route.interchange_points.forEach((station) => {
      if (!routeStationHasCoordinates(station)) {
        return;
      }
      const color = getLineColor("transfer");
      changeFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [station.longitude as number, station.latitude as number],
        },
        properties: {
          color,
          title: station.station_name,
          originIndex,
        },
      });
    });
  });

  return {
    lineFeatures: toFeatureCollection(lineFeatures),
    changeFeatures: toFeatureCollection(changeFeatures),
  };
}

function buildOriginFeatures(origins: StationSelection[]) {
  const features: GeoJSON.Feature[] = [];
  origins.forEach((origin, index) => {
    if (!selectionHasCoordinates(origin)) {
      return;
    }
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [origin.longitude, origin.latitude],
      },
      properties: {
        title: origin.name,
        index,
      },
    });
  });
  return toFeatureCollection(features);
}

function buildDestinationFeature(destination: RouteStation | null) {
  if (!destination || !routeStationHasCoordinates(destination)) {
    return EMPTY_FEATURE_COLLECTION;
  }
  return toFeatureCollection([
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [destination.longitude as number, destination.latitude as number],
      },
      properties: {
        title: destination.station_name,
      },
    },
  ]);
}

function collectCoordinates(
  origins: StationSelection[],
  destination: RouteStation | null,
  routes: RouteDetails[] | null,
): Coordinate[] {
  const coords: Coordinate[] = [];

  origins.forEach((origin) => {
    if (selectionHasCoordinates(origin)) {
      coords.push([origin.longitude, origin.latitude]);
    }
  });

  if (destination && routeStationHasCoordinates(destination)) {
    coords.push([destination.longitude as number, destination.latitude as number]);
  }

  routes?.forEach((route) => {
    route.segments.forEach((segment) => {
      if (segmentHasCoordinates(segment)) {
        coords.push(
          [segment.from.longitude as number, segment.from.latitude as number],
          [segment.to.longitude as number, segment.to.latitude as number],
        );
      }
    });
  });

  return coords;
}

function getBoundsSignature(coords: Coordinate[]): string {
  if (coords.length === 0) {
    return "none";
  }
  return coords
    .map(([lng, lat]) => `${lng.toFixed(4)},${lat.toFixed(4)}`)
    .join(";");
}

export default function MapView({
  origins,
  destination,
  routes,
  isLoadingRoutes,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const isMapReadyRef = useRef(false);
  const lastBoundsSignatureRef = useRef<string>("none");

  useEffect(() => {
    let isCancelled = false;

    const initialiseMap = async () => {
      if (!containerRef.current || mapRef.current || isCancelled) {
        return;
      }

      if (typeof window === "undefined") {
        return;
      }

      const maplibreWithWorker = maplibregl as MapLibreWithWorker;
      if (!maplibreWithWorker.workerClass) {
        const workerModule = await import("maplibre-gl/dist/maplibre-gl-csp-worker.js");
        const workerExport =
          (workerModule as unknown as { default?: unknown })?.default ?? workerModule;
        maplibreWithWorker.workerClass = workerExport as unknown as typeof Worker;
      }

      if (!containerRef.current || mapRef.current || isCancelled) {
        return;
      }

      const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
      const styleUrl = maptilerKey
        ? `https://api.maptiler.com/maps/streets/style.json?key=${maptilerKey}`
        : "https://demotiles.maplibre.org/style.json";

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      const handleWindowResize = () => {
        map.resize();
      };

      window.addEventListener("resize", handleWindowResize);

      map.on("load", () => {
        map.addSource("halfway-origins", {
          type: "geojson",
          data: EMPTY_FEATURE_COLLECTION,
        });
        map.addLayer({
          id: "halfway-origins-layer",
          type: "circle",
          source: "halfway-origins",
          paint: {
            "circle-radius": 6,
            "circle-color": "#1d4ed8",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
          },
        });

        map.addSource("halfway-destination", {
          type: "geojson",
          data: EMPTY_FEATURE_COLLECTION,
        });
        map.addLayer({
          id: "halfway-destination-layer",
          type: "circle",
          source: "halfway-destination",
          paint: {
            "circle-radius": 7,
            "circle-color": "#f97316",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });

        map.addSource("halfway-routes", {
          type: "geojson",
          data: EMPTY_FEATURE_COLLECTION,
        });
        map.addLayer({
          id: "halfway-routes-layer",
          type: "line",
          source: "halfway-routes",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": ["get", "color"],
            "line-width": [
              "+",
              4,
              [
                "*",
                ["coalesce", ["to-number", ["get", "originIndex"]], 0],
                0.5,
              ],
            ],
            "line-opacity": 0.9,
          },
        });

        map.addSource("halfway-changes", {
          type: "geojson",
          data: EMPTY_FEATURE_COLLECTION,
        });
        map.addLayer({
          id: "halfway-changes-layer",
          type: "circle",
          source: "halfway-changes",
          paint: {
            "circle-radius": 5,
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
          },
        });

        isMapReadyRef.current = true;
        map.resize();
      });

      mapRef.current = map;

      map.once("remove", () => {
        window.removeEventListener("resize", handleWindowResize);
      });
    };

    void initialiseMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      isMapReadyRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMapReadyRef.current || !mapRef.current) {
      return;
    }

    const map = mapRef.current;

    const originsSource = map.getSource("halfway-origins") as GeoJSONSource | undefined;
    const destinationSource = map.getSource("halfway-destination") as GeoJSONSource | undefined;
    const routesSource = map.getSource("halfway-routes") as GeoJSONSource | undefined;
    const changesSource = map.getSource("halfway-changes") as GeoJSONSource | undefined;

    const originFeatures = buildOriginFeatures(origins);
    const destinationFeature = buildDestinationFeature(destination);
    const { lineFeatures, changeFeatures } = buildRouteFeatures(routes);

    originsSource?.setData(originFeatures);
    destinationSource?.setData(destinationFeature);
    routesSource?.setData(lineFeatures);
    changesSource?.setData(changeFeatures);

    const coords = collectCoordinates(origins, destination, routes);
    const signature = getBoundsSignature(coords);

    if (signature !== lastBoundsSignatureRef.current) {
      lastBoundsSignatureRef.current = signature;

      if (coords.length === 0) {
        map.easeTo({
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          duration: 800,
        });
      } else if (coords.length === 1) {
        map.easeTo({
          center: coords[0],
          zoom: 12,
          duration: 800,
        });
      } else {
        const bounds = coords.reduce(
          (acc, coord) => acc.extend(coord),
          new maplibregl.LngLatBounds(coords[0], coords[0]),
        );
        map.fitBounds(bounds, {
          padding: Math.min(
            Math.max(map.getCanvas().width, map.getCanvas().height) * 0.1,
            120,
          ),
          duration: 800,
        });
      }
    }

    map.resize();
  }, [origins, destination, routes]);

  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
      style={{ height: "384px" }}
    >
      {!maptilerKey && (
        <div className="pointer-events-none absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-xs text-gray-600 shadow">
          Set <code>NEXT_PUBLIC_MAPTILER_API_KEY</code> for branded tiles.
        </div>
      )}
      {isLoadingRoutes && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
        </div>
      )}
    </div>
  );
}
