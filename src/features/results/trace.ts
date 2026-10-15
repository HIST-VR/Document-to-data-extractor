import { createContext, useContext } from "react";

export type TraceEvent = "enter" | "leave" | "focus" | "blur";

export interface TraceTarget {
  evidence: string | null;
  page: number | null;
}

export interface Provenance {
  evidence: string;
  page: number | null;
}

export const TraceContext = createContext<(event: TraceEvent, target: TraceTarget) => void>(() => {});

export function useTrace(): (event: TraceEvent, target: TraceTarget) => void {
  return useContext(TraceContext);
}
