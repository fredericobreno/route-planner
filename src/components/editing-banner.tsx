"use client";

import { Check } from "lucide-react";
import { useEffect } from "react";
import { usePlanner } from "@/components/planner-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRegionColor, getRegionLabel } from "@/lib/regions";

const EditingBanner = () => {
  const { state, dispatch } = usePlanner();
  const { editingRegion } = state;

  useEffect(() => {
    if (editingRegion === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch({ type: "stopEditing" });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingRegion, dispatch]);

  if (editingRegion === null) return null;

  return (
    <Card size="sm" className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: getRegionColor(editingRegion) }}
          />
          Editando {getRegionLabel(editingRegion)}
        </CardTitle>
        <CardDescription className="text-xs">
          Clique em um ponto da região para removê-lo, ou em outro ponto para
          adicioná-lo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          className="w-full"
          onClick={() => dispatch({ type: "stopEditing" })}
        >
          <Check />
          Concluir
        </Button>
      </CardContent>
    </Card>
  );
};

export default EditingBanner;
