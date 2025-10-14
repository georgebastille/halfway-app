"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

const DEFAULT_VIEW = {
  center: [-2.5, 54.0] as [number, number],
  zoom: 5,
};

type MapLibreWithWorker = typeof maplibregl & {
  workerClass?: typeof Worker;
};

export default function MapTestPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initialising map…");

  useEffect(() => {
    let isMounted = true;

    const initialiseMap = async () => {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const maplibreWithWorker = maplibregl as MapLibreWithWorker;
      if (!maplibreWithWorker.workerClass) {
        const workerModule = await import("maplibre-gl/dist/maplibre-gl-csp-worker.js");
        const workerExport =
          (workerModule as unknown as { default?: unknown })?.default ?? workerModule;
        maplibreWithWorker.workerClass = workerExport as unknown as typeof Worker;
      }

      if (!containerRef.current || mapRef.current || !isMounted) {
        return;
      }

      const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
      const styleUrl = maptilerKey
        ? `https://api.maptiler.com/maps/streets/style.json?key=${maptilerKey}`
        : "https://demotiles.maplibre.org/style.json";

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: DEFAULT_VIEW.center,
        zoom: DEFAULT_VIEW.zoom,
        attributionControl: true,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      const reportRender = () => {
        if (!isMounted) {
          return;
        }
        const canvas = map.getCanvas();
        const bounds = containerRef.current?.getBoundingClientRect();
        const containerSummary =
          bounds && bounds.height > 0
            ? `${Math.round(bounds.width)}×${Math.round(bounds.height)}`
            : "container height is zero";
        setStatusMessage(
          [
            `Canvas: ${canvas.width}×${canvas.height}`,
            `Container: ${containerSummary}`,
            `Zoom: ${map.getZoom().toFixed(2)}`,
          ].join(" • "),
        );
        map.off("render", reportRender);
      };

      map.on("render", reportRender);

      map.once("load", () => {
        if (!isMounted) {
          return;
        }
        map.resize();
        setStatusMessage("Map tiles loaded successfully.");
      });

      map.on("error", (event) => {
        if (!isMounted) {
          return;
        }
        console.error("MapLibre error:", event.error);
        setStatusMessage(`Map error: ${event.error?.message ?? "unknown error"}`);
      });

      const handleWindowResize = () => {
        map.resize();
      };
      window.addEventListener("resize", handleWindowResize);

      mapRef.current = map;
      map.once("remove", () => {
        window.removeEventListener("resize", handleWindowResize);
      });
    };

    void initialiseMap();

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-semibold text-gray-800">Map Test Page</h1>
        <p className="mt-2 text-sm text-gray-600">
          A barebones MapLibre instance to sanity check tile loading, worker setup, and
          canvas sizing.
        </p>
      </header>

      <section>
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm"
          style={{ height: "480px" }}
        >
          <div className="pointer-events-none absolute left-4 top-4 rounded bg-white/80 px-3 py-1 text-xs text-gray-700 shadow">
            {statusMessage}
          </div>
        </div>
        {!process.env.NEXT_PUBLIC_MAPTILER_API_KEY && (
          <p className="mt-3 text-sm text-amber-600">
            Using MapLibre demo tiles because <code>NEXT_PUBLIC_MAPTILER_API_KEY</code> is not set.
          </p>
        )}
      </section>
    </div>
  );
}
