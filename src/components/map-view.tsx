"use client";

import "leaflet/dist/leaflet.css";
import {
  DomEvent,
  type LatLngTuple,
  type LeafletEventHandlerFnMap,
  latLngBounds,
  type Path,
  type PathOptions,
} from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { usePlanner } from "@/components/planner-provider";
import type { Client } from "@/lib/planner";
import {
  getRegionColor,
  getRegionLabel,
  getRegionShapes,
  type RegionShape,
} from "@/lib/regions";

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

const MapClickExit = () => {
  const { state, dispatch } = usePlanner();

  useMapEvents({
    click: () => {
      if (state.editingRegion !== null) dispatch({ type: "stopEditing" });
    },
  });

  return null;
};

// `weight: 24` and `radius: 12` are the 12 px screen buffer, so lines and
// points only change opacity when highlighted.
const getShapeStyle = (
  shape: RegionShape,
  editingRegion: number | null,
): PathOptions => {
  const isEditing = editingRegion !== null;
  const isEdited = editingRegion === shape.region;
  switch (shape.kind) {
    case "polygon":
      return {
        color: shape.color,
        weight: isEdited ? 4 : 2,
        opacity: isEditing && !isEdited ? 0.4 : 1,
        fillOpacity: isEdited ? 0.35 : isEditing ? 0.08 : 0.2,
      };
    case "line":
      return {
        color: shape.color,
        weight: 24,
        lineCap: "round",
        opacity: isEdited ? 0.6 : isEditing ? 0.15 : 0.35,
      };
    case "point":
      return {
        color: shape.color,
        weight: 0,
        fillColor: shape.color,
        fillOpacity: isEdited ? 0.6 : isEditing ? 0.15 : 0.35,
      };
  }
};

const RegionLayer = ({ shape }: { shape: RegionShape }) => {
  const { state, dispatch } = usePlanner();
  const layerRef = useRef<Path | null>(null);
  const setLayer = (layer: Path | null) => {
    layerRef.current = layer;
  };

  // A permanent tooltip keeps the position it opened at; reopening it
  // re-centers the label after the shape changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shape` is the trigger, not a value read inside
  useEffect(() => {
    layerRef.current?.openTooltip();
  }, [shape]);

  const pathOptions = getShapeStyle(shape, state.editingRegion);
  // Points share the canvas with shapes; keeping shapes at the back keeps
  // points on top for drawing and click hit-testing.
  const eventHandlers: LeafletEventHandlerFnMap = {
    add: (event) => (event.target as Path).bringToBack(),
    click: (event) => {
      DomEvent.stopPropagation(event);
      if (state.editingRegion !== shape.region) {
        dispatch({ type: "startEditing", region: shape.region });
      }
    },
  };
  const tooltip = (
    <Tooltip permanent direction="center">
      {getRegionLabel(shape.region)}
    </Tooltip>
  );

  switch (shape.kind) {
    case "polygon":
      return (
        <Polygon
          ref={setLayer}
          positions={shape.positions}
          pathOptions={pathOptions}
          eventHandlers={eventHandlers}
        >
          {tooltip}
        </Polygon>
      );
    case "line":
      return (
        <Polyline
          ref={setLayer}
          positions={shape.positions}
          pathOptions={pathOptions}
          eventHandlers={eventHandlers}
        >
          {tooltip}
        </Polyline>
      );
    case "point":
      return (
        <CircleMarker
          ref={setLayer}
          center={shape.position}
          radius={12}
          pathOptions={pathOptions}
          eventHandlers={eventHandlers}
        >
          {tooltip}
        </CircleMarker>
      );
  }
};

const MapView = () => {
  const { state, dispatch, clients } = usePlanner();
  const shapes = useMemo(
    () => getRegionShapes(clients, state.assignments),
    [clients, state.assignments],
  );

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
      {shapes.map((shape) => (
        <RegionLayer key={`${shape.region}-${shape.kind}`} shape={shape} />
      ))}
      {clients.map((client) => {
        const region = state.assignments.get(client.rowIndex);
        return (
          <CircleMarker
            key={client.rowIndex}
            center={[client.lat, client.lng]}
            radius={5}
            pathOptions={{
              color: "#ffffff",
              weight: 1,
              fillColor: region ? getRegionColor(region) : POINT_COLOR,
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: (event) => {
                DomEvent.stopPropagation(event);
                if (state.editingRegion !== null) {
                  dispatch({ type: "togglePoint", rowIndex: client.rowIndex });
                }
              },
            }}
          />
        );
      })}
      <FitBounds clients={clients} />
      <MapClickExit />
    </MapContainer>
  );
};

export default MapView;
