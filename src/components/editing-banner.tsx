"use client";

import { Check } from "lucide-react";
import { useEffect } from "react";
import { usePlanner } from "@/components/planner-provider";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
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
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-3 rounded-lg border bg-background p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: getRegionColor(editingRegion) }}
          />
          Editando {getRegionLabel(editingRegion)}
        </div>
        <p className="text-xs text-muted-foreground">
          Clique em um ponto da região para removê-lo, ou em outro ponto para
          adicioná-lo.
        </p>
        <Button
          size="sm"
          className="w-full"
          onClick={() => dispatch({ type: "stopEditing" })}
        >
          <Check />
          Concluir
        </Button>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default EditingBanner;
