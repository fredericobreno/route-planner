"use client";

import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { usePlanner } from "@/components/planner-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { getSummary } from "@/lib/planner";
import { getRegionColor, getRegionLabel } from "@/lib/regions";

const SummaryRow = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between gap-2">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-medium tabular-nums">{value}</dd>
  </div>
);

const SummaryCard = () => {
  const { state, clientRows, clients, invalidRowIndexes } = usePlanner();
  const { regions, unassigned } = useMemo(
    () => getSummary(clients, state.assignments),
    [clients, state.assignments],
  );

  if (!state.sheet) return null;

  return (
    <Collapsible defaultOpen render={<Card size="sm" className="shadow-lg" />}>
      <CardHeader className="items-center">
        <CardTitle>Resumo</CardTitle>
        <CardAction>
          <CollapsibleTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mostrar ou ocultar resumo"
              />
            }
          >
            <ChevronDown className="transition-transform in-data-panel-open:rotate-180" />
          </CollapsibleTrigger>
        </CardAction>
      </CardHeader>
      <CollapsibleContent
        render={<CardContent className="flex flex-col gap-3 text-sm" />}
      >
        <dl className="flex flex-col gap-1.5">
          <SummaryRow label="Clientes importados" value={clientRows.length} />
          {state.columnMapping && (
            <>
              <SummaryRow
                label="Coordenadas inválidas"
                value={invalidRowIndexes.length}
              />
              <SummaryRow label="Grupos na tela" value={regions.length} />
              <SummaryRow label="Clientes sem região" value={unassigned} />
            </>
          )}
        </dl>
        {regions.length > 0 && (
          <>
            <Separator />
            <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
              {regions.map(({ region, count }) => (
                <li key={region} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getRegionColor(region) }}
                  />
                  {getRegionLabel(region)} — {count} clientes
                </li>
              ))}
            </ul>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SummaryCard;
