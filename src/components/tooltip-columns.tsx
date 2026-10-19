"use client";

import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getCellText, getColumnLabels } from "@/lib/sheet";

const TooltipColumns = () => {
  const { state, dispatch, headers, clientRows } = usePlanner();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  if (!state.sheet) return null;

  const { sheet } = state;
  const labels = getColumnLabels(headers);
  const exampleRowIndex = clientRows[0]?.rowIndex;

  const openDialog = () => {
    setSelected(state.tooltipColumns);
    setOpen(true);
  };

  const toggle = (column: number, checked: boolean) => {
    setSelected((current) =>
      checked
        ? [...current, column].sort((a, b) => a - b)
        : current.filter((value) => value !== column),
    );
  };

  const confirm = () => {
    dispatch({ type: "setTooltipColumns", columns: selected });
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={headers.length === 0}
        onClick={openDialog}
      >
        <MessageSquareText />
        Colunas do tooltip ({state.tooltipColumns.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Colunas do tooltip</DialogTitle>
            <DialogDescription>
              Escolha os dados exibidos ao passar o mouse sobre um ponto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(labels.map((_, column) => column))}
            >
              Selecionar todas
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Limpar
            </Button>
          </div>
          <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto rounded-lg border p-2">
            {labels.map((label, column) => {
              const id = `tooltip-column-${column}`;
              const example =
                exampleRowIndex === undefined
                  ? ""
                  : getCellText(sheet, exampleRowIndex, column);
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <Checkbox
                    id={id}
                    checked={selected.includes(column)}
                    onCheckedChange={(checked) => toggle(column, checked)}
                  />
                  <Label htmlFor={id} className="min-w-0 flex-1 font-normal">
                    <span className="truncate">{label}</span>
                    {example && (
                      <span className="ml-auto max-w-40 truncate text-xs text-muted-foreground">
                        {example}
                      </span>
                    )}
                  </Label>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button onClick={confirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TooltipColumns;
