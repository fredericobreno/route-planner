"use client";

import { Shapes } from "lucide-react";
import { useState } from "react";
import { usePlanner } from "@/components/planner-provider";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { groupClients } from "@/lib/grouping";

const GroupingForm = () => {
  const { state, dispatch, clients } = usePlanner();
  const [value, setValue] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const size = Number(value);
  const isValid = Number.isInteger(size) && size >= 1;

  const generate = () => {
    dispatch({ type: "setGroups", assignments: groupClients(clients, size) });
  };

  const handleClick = () => {
    if (state.assignments.size > 0) {
      setConfirmOpen(true);
    } else {
      generate();
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Grupos</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-size">Clientes por grupo</Label>
          <Input
            id="group-size"
            type="number"
            min={1}
            step={1}
            placeholder="Ex.: 10"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <Button
          className="w-full"
          disabled={clients.length === 0 || !isValid}
          onClick={handleClick}
        >
          <Shapes />
          Gerar grupos
        </Button>
      </SidebarGroupContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar novos grupos?</AlertDialogTitle>
            <AlertDialogDescription>
              Os grupos e edições atuais serão descartados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                generate();
                setConfirmOpen(false);
              }}
            >
              Gerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  );
};

export default GroupingForm;
