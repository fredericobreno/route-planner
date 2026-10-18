"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useMemo,
  useReducer,
} from "react";
import {
  type Client,
  type ClientRow,
  createInitialState,
  getClientRows,
  getClients,
  getHeaders,
  type PlannerAction,
  type PlannerState,
  plannerReducer,
} from "@/lib/planner";

type PlannerContextValue = {
  state: PlannerState;
  dispatch: Dispatch<PlannerAction>;
  headers: string[];
  clientRows: ClientRow[];
  clients: Client[];
  invalidRowIndexes: number[];
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

const PlannerProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(
    plannerReducer,
    undefined,
    createInitialState,
  );

  const headers = useMemo(
    () => (state.sheet ? getHeaders(state.sheet) : []),
    [state.sheet],
  );
  const clientRows = useMemo(
    () => (state.sheet ? getClientRows(state.sheet) : []),
    [state.sheet],
  );
  const { clients, invalidRowIndexes } = useMemo(
    () =>
      state.columnMapping
        ? getClients(clientRows, state.columnMapping)
        : { clients: [], invalidRowIndexes: [] },
    [clientRows, state.columnMapping],
  );

  return (
    <PlannerContext
      value={{
        state,
        dispatch,
        headers,
        clientRows,
        clients,
        invalidRowIndexes,
      }}
    >
      {children}
    </PlannerContext>
  );
};

export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error("usePlanner must be used within PlannerProvider");
  }
  return context;
};

export default PlannerProvider;
