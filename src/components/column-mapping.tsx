"use client";

import { useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getColumnLabels } from "@/lib/sheet";

type ColumnSelectProps = {
  id: string;
  label: string;
  items: { label: string; value: number }[];
  value: number | null;
  disabledValue: number | null;
  onChange: (value: number) => void;
};

const ColumnSelect = ({
  id,
  label,
  items,
  value,
  disabledValue,
  onChange,
}: ColumnSelectProps) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Selecione a coluna" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            disabled={item.value === disabledValue}
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const ColumnMapping = () => {
  const { state, dispatch, headers } = usePlanner();
  const [latColumn, setLatColumn] = useState<number | null>(
    state.columnMapping?.latColumn ?? null,
  );
  const [lngColumn, setLngColumn] = useState<number | null>(
    state.columnMapping?.lngColumn ?? null,
  );

  const items = getColumnLabels(headers).map((label, value) => ({
    label,
    value,
  }));

  const update = (lat: number | null, lng: number | null) => {
    setLatColumn(lat);
    setLngColumn(lng);
    if (lat !== null && lng !== null) {
      dispatch({
        type: "setColumnMapping",
        mapping: { latColumn: lat, lngColumn: lng },
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ColumnSelect
        id="lat-column"
        label="Latitude"
        items={items}
        value={latColumn}
        disabledValue={lngColumn}
        onChange={(value) => update(value, lngColumn)}
      />
      <ColumnSelect
        id="lng-column"
        label="Longitude"
        items={items}
        value={lngColumn}
        disabledValue={latColumn}
        onChange={(value) => update(latColumn, value)}
      />
    </div>
  );
};

export default ColumnMapping;
