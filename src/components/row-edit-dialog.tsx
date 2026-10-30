"use client";

import { type FormEvent, useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type CellUpdates, parseCoordinate } from "@/lib/planner";
import {
  buildEditedCell,
  getCell,
  getColumnLabels,
  getEditableText,
} from "@/lib/sheet";

type RowEditDialogProps = {
  rowIndex: number | null;
  onOpenChange: (open: boolean) => void;
};

const RowEditDialog = ({ rowIndex, onOpenChange }: RowEditDialogProps) => {
  const { state, dispatch, headers } = usePlanner();
  const { sheet, columnMapping } = state;
  const open = rowIndex !== null;
  const [wasOpen, setWasOpen] = useState(false);
  // Kept after closing so the content does not vanish during the animation.
  const [shownRowIndex, setShownRowIndex] = useState<number | null>(null);
  const [initialValues, setInitialValues] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (rowIndex !== null && sheet) {
      const texts = headers.map((_, column) =>
        getEditableText(sheet, rowIndex, column),
      );
      setShownRowIndex(rowIndex);
      setInitialValues(texts);
      setValues(texts);
    }
  }

  if (!sheet || !columnMapping || shownRowIndex === null) return null;

  const labels = getColumnLabels(headers);
  const coordinateAxes = new Map([
    [columnMapping.latColumn, "lat" as const],
    [columnMapping.lngColumn, "lng" as const],
  ]);
  const isInvalid = (column: number) => {
    const axis = coordinateAxes.get(column);
    return axis !== undefined && parseCoordinate(values[column], axis) === null;
  };
  const hasInvalid = labels.some((_, column) => isInvalid(column));

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (hasInvalid) return;
    const cells: CellUpdates = new Map();
    values.forEach((value, column) => {
      if (value === initialValues[column]) return;
      const axis = coordinateAxes.get(column);
      if (axis) {
        const coordinate = parseCoordinate(value, axis);
        if (coordinate !== null) cells.set(column, { t: "n", v: coordinate });
      } else {
        cells.set(
          column,
          buildEditedCell(getCell(sheet, shownRowIndex, column), value),
        );
      }
    });
    if (cells.size > 0) {
      dispatch({ type: "updateCells", rowIndex: shownRowIndex, cells });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Editar linha {shownRowIndex + 1}</DialogTitle>
            <DialogDescription>
              As alterações entram na planilha exportada.
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-1 flex max-h-[60vh] flex-col gap-3 overflow-auto px-1">
            {labels.map((label, column) => {
              const id = `row-edit-${column}`;
              const invalid = isInvalid(column);
              return (
                <div key={id} className="flex flex-col gap-1.5">
                  <Label htmlFor={id}>{label}</Label>
                  <Input
                    id={id}
                    value={values[column] ?? ""}
                    aria-invalid={invalid}
                    onChange={(event) =>
                      setValues(values.with(column, event.target.value))
                    }
                  />
                  {invalid && (
                    <p className="text-destructive text-xs">
                      Coordenada inválida.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={hasInvalid}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RowEditDialog;
