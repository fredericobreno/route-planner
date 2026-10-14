"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` on import, so it must never run on the server.
const RouteMap = dynamic(() => import("@/components/map-view"), {
  ssr: false,
});

export default RouteMap;
