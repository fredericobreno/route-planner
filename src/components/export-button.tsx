"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { exportSheet } from "@/lib/sheet";

const ExportButton = () => {
  const { state } = usePlanner();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!state.sheet) return;
    try {
      exportSheet(state.sheet, state.assignments);
      setError(null);
    } catch (exportError) {
      console.error(exportError);
      setError("Não foi possível exportar o arquivo.");
    }
  };

  return (
    <>
      <Button
        className="w-full"
        disabled={state.sheet === null}
        onClick={handleClick}
      >
        <Download />
        Exportar
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default ExportButton;
