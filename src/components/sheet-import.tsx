"use client";

import { FileSpreadsheet, TableProperties, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import ColumnMapping from "@/components/column-mapping";
import HeaderRowDialog from "@/components/header-row-dialog";
import { usePlanner } from "@/components/planner-provider";
import TooltipColumns from "@/components/tooltip-columns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import type { Sheet } from "@/lib/planner";
import { readSheet } from "@/lib/sheet";

const SheetImport = () => {
  const { state, dispatch } = usePlanner();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSheet, setPendingSheet] = useState<Sheet | null>(null);
  const [headerDialogOpen, setHeaderDialogOpen] = useState(false);

  const load = (sheet: Sheet) => {
    dispatch({ type: "loadSheet", sheet });
    setHeaderDialogOpen(true);
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    let sheet: Sheet;
    try {
      sheet = readSheet(await file.arrayBuffer(), file.name);
    } catch (readError) {
      console.error(readError);
      setError(
        readError instanceof Error
          ? readError.message
          : "Não foi possível ler o arquivo.",
      );
      return;
    }

    setError(null);
    if (state.sheet) {
      setPendingSheet(sheet);
    } else {
      load(sheet);
    }
  };

  const confirmReplace = () => {
    if (pendingSheet) load(pendingSheet);
    setPendingSheet(null);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Planilha</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleChange}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          Importar planilha
        </Button>
        <p className="text-xs text-muted-foreground">
          Formatos: .xlsx, .xls, .csv
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {state.sheet && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate" title={state.sheet.fileName}>
                {state.sheet.fileName}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setHeaderDialogOpen(true)}
            >
              <TableProperties />
              Alterar cabeçalho
            </Button>
            <ColumnMapping key={state.sheet.headerRowIndex} />
            <TooltipColumns />
          </>
        )}
      </SidebarGroupContent>

      <HeaderRowDialog
        open={headerDialogOpen}
        onOpenChange={setHeaderDialogOpen}
      />

      <AlertDialog
        open={pendingSheet !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSheet(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir planilha?</AlertDialogTitle>
            <AlertDialogDescription>
              Os pontos, grupos e edições atuais serão descartados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplace}>
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  );
};

export default SheetImport;
