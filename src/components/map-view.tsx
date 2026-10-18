"use client";

import "leaflet/dist/leaflet.css";
import { type LatLngTuple, latLngBounds } from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import { usePlanner } from "@/components/planner-provider";
import type { Client } from "@/lib/planner";

const BRAZIL_CENTER: LatLngTuple = [-14.235, -51.9253];
// Canvas rendering cannot read CSS variables.
const POINT_COLOR = "#6b7280";

const FitBounds = ({ clients }: { clients: Client[] }) => {
  const map = useMap();

  useEffect(() => {
    if (clients.length === 0) return;
    map.fitBounds(latLngBounds(clients.map(({ lat, lng }) => [lat, lng])), {
      padding: [32, 32],
      maxZoom: 15,
    });
  }, [map, clients]);

  return null;
};

const MapView = () => {
  const { clients } = usePlanner();

  return (
    // `isolate` keeps Leaflet's high z-index panes from covering dialogs.
    <MapContainer
      center={BRAZIL_CENTER}
      zoom={4}
      preferCanvas
      className="isolate size-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {clients.map((client) => (
        <CircleMarker
          key={client.rowIndex}
          center={[client.lat, client.lng]}
          radius={5}
          pathOptions={{
            color: "#ffffff",
            weight: 1,
            fillColor: POINT_COLOR,
            fillOpacity: 0.9,
          }}
        />
      ))}
      <FitBounds clients={clients} />
    </MapContainer>
  );
};

export default MapView;
