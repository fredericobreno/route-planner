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
import type { Client, Sheet } from "@/lib/planner";
import {
  getRegionColor,
  getRegionLabel,
  getRegionShapes,
  getShapeArea,
  type RegionShape,
} from "@/lib/regions";
import { getCellText, getColumnLabels } from "@/lib/sheet";

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

// Leaflet only tracks window resizes; the sidebar collapsing resizes the map
// container without one.
const InvalidateSizeOnResize = () => {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

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

const getShapeKey = (shape: RegionShape) => `${shape.region}-${shape.kind}`;

type RegionLayerProps = {
  shape: RegionShape;
  onLayer: (layer: Path | null) => void;
  onAdd: () => void;
};

const RegionLayer = ({ shape, onLayer, onAdd }: RegionLayerProps) => {
  const { state, dispatch } = usePlanner();
  const layerRef = useRef<Path | null>(null);
  const setLayer = (layer: Path | null) => {
    layerRef.current = layer;
    onLayer(layer);
  };

  // A permanent tooltip keeps the position it opened at; reopening it
  // re-centers the label after the shape changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shape` is the trigger, not a value read inside
  useEffect(() => {
    layerRef.current?.openTooltip();
  }, [shape]);

  const pathOptions = getShapeStyle(shape, state.editingRegion);
  const eventHandlers: LeafletEventHandlerFnMap = {
    add: onAdd,
    click: (event) => {
      DomEvent.stopPropagation(event);
      if (state.editingRegion !== shape.region) {
        dispatch({ type: "startEditing", region: shape.region });
      }
    },
  };
  const tooltip =
    state.editingRegion === shape.region ? (
      <Tooltip permanent direction="center">
        {getRegionLabel(shape.region)}
      </Tooltip>
    ) : null;

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

// Built with `textContent` so spreadsheet values are never parsed as HTML.
const buildPointTooltip = (
  sheet: Sheet,
  rowIndex: number,
  columns: number[],
  labels: string[],
) => {
  const container = document.createElement("div");
  container.className =
    "flex w-max max-w-64 flex-col gap-0.5 whitespace-normal";
  for (const column of columns) {
    const line = document.createElement("div");
    const label = document.createElement("span");
    label.className = "font-medium";
    label.textContent = `${labels[column]}: `;
    line.append(label, getCellText(sheet, rowIndex, column) || "—");
    container.append(line);
  }
  return container;
};

const MapView = () => {
  const { state, dispatch, clients, headers } = usePlanner();
  const columnLabels = useMemo(() => getColumnLabels(headers), [headers]);
  const shapes = useMemo(
    () => getRegionShapes(clients, state.assignments),
    [clients, state.assignments],
  );
  const regionLayersRef = useRef(
    new Map<string, { shape: RegionShape; layer: Path }>(),
  );
  const orderScheduledRef = useRef(false);

  // The canvas hit test picks the last-drawn layer, so smaller regions go in
  // front of larger ones and receive clicks on overlaps; `bringToBack` also
  // keeps every region behind the points. Deferring to a microtask also
  // covers layers re-added later in the same commit (e.g. StrictMode
  // remounts), which would otherwise land on top.
  const scheduleRegionOrder = () => {
    if (orderScheduledRef.current) return;
    orderScheduledRef.current = true;
    queueMicrotask(() => {
      orderScheduledRef.current = false;
      const entries = [...regionLayersRef.current.values()].sort(
        (a, b) => getShapeArea(a.shape) - getShapeArea(b.shape),
      );
      for (const { layer } of entries) layer.bringToBack();
    });
  };

  useEffect(() => {
    scheduleRegionOrder();
  });

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
        <RegionLayer
          key={getShapeKey(shape)}
          shape={shape}
          onLayer={(layer) => {
            if (layer) {
              regionLayersRef.current.set(getShapeKey(shape), { shape, layer });
            } else {
              regionLayersRef.current.delete(getShapeKey(shape));
            }
          }}
          onAdd={scheduleRegionOrder}
        />
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
                } else if (region === undefined) {
                  dispatch({ type: "createRegion", rowIndex: client.rowIndex });
                }
              },
              mouseover: (event) => {
                if (!state.sheet || state.tooltipColumns.length === 0) return;
                (event.target as Path)
                  .bindTooltip(
                    buildPointTooltip(
                      state.sheet,
                      client.rowIndex,
                      state.tooltipColumns,
                      columnLabels,
                    ),
                    { direction: "top", offset: [0, -6] },
                  )
                  .openTooltip();
              },
              mouseout: (event) => {
                (event.target as Path).unbindTooltip();
              },
            }}
          />
        );
      })}
      <FitBounds clients={clients} />
      <MapClickExit />
      <InvalidateSizeOnResize />
    </MapContainer>
  );
};

export default MapView;
