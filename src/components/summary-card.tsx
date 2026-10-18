"use client";

import { useMemo } from "react";
import { usePlanner } from "@/components/planner-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarGroup } from "@/components/ui/sidebar";
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
    <SidebarGroup>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
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
        </CardContent>
      </Card>
    </SidebarGroup>
  );
};

export default SummaryCard;
