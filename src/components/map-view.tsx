"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngTuple } from "leaflet";
import { MapContainer, TileLayer } from "react-leaflet";

const BRAZIL_CENTER: LatLngTuple = [-14.235, -51.9253];

const MapView = () => (
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
  </MapContainer>
);

export default MapView;
