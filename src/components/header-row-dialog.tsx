"use client";

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPreviewRows } from "@/lib/planner";

type HeaderRowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const HeaderRowDialog = ({ open, onOpenChange }: HeaderRowDialogProps) => {
  const { state, dispatch } = usePlanner();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelectedIndex(state.sheet?.headerRowIndex ?? null);
  }

  if (!state.sheet) return null;

  const previewRows = getPreviewRows(state.sheet.rawRows);
  const columnCount = Math.max(
    0,
    ...previewRows.map(({ cells }) => cells.length),
  );

  const confirm = () => {
    if (
      selectedIndex !== null &&
      selectedIndex !== state.sheet?.headerRowIndex
    ) {
      dispatch({ type: "setHeaderRow", index: selectedIndex });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Escolha a linha de cabeçalho</DialogTitle>
          <DialogDescription>
            Clique na linha que contém os nomes das colunas. As linhas acima
            dela não serão consideradas clientes.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Linha</TableHead>
                {Array.from({ length: columnCount }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: columns have no other identity
                  <TableHead key={i} />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map(({ rowIndex, cells }) => (
                <TableRow
                  key={rowIndex}
                  tabIndex={0}
                  aria-selected={rowIndex === selectedIndex}
                  data-state={
                    rowIndex === selectedIndex ? "selected" : undefined
                  }
                  className="cursor-pointer"
                  onClick={() => setSelectedIndex(rowIndex)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedIndex(rowIndex);
                    }
                  }}
                >
                  <TableCell className="text-muted-foreground">
                    {rowIndex + 1}
                  </TableCell>
                  {Array.from({ length: columnCount }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: columns have no other identity
                    <TableCell key={i} className="max-w-40 truncate">
                      {String(cells[i] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button disabled={selectedIndex === null} onClick={confirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HeaderRowDialog;
