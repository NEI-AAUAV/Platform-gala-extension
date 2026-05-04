import { useState, useCallback } from "react";

export interface Companion {
  name: string;
  meal: string;
  allergies: string;
  email?: string;
}

export type BusOption = "round_trip" | "one_way" | "none";

export interface WizardData {
  nmec: string;
  phone: string;
  year: number | null;
  bus: BusOption;
  meal: string;
  allergies: string;
  companions: Companion[];
  phasedPayment: boolean;
  paymentProofPhase1: string | null;
  paymentProofPhase2: string | null;
  tableId: string | null;
  tableRole: "owner" | "member" | "invited" | null;
  tableName: string | undefined;
  currentStep: number;
}

const STORAGE_KEY_PREFIX = "gala-wizard-state";

const defaultData: WizardData = {
  nmec: "",
  phone: "",
  year: null,
  bus: "none",
  meal: "",
  allergies: "",
  companions: [],
  phasedPayment: false,
  paymentProofPhase1: null,
  paymentProofPhase2: null,
  tableId: null,
  tableRole: null,
  tableName: undefined,
  currentStep: 1,
};

function storageKey(userId: string | undefined): string {
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX;
}

function loadData(userId: string | undefined): WizardData {
  try {
    const stored = localStorage.getItem(storageKey(userId));
    if (!stored) return defaultData;
    return { ...defaultData, ...JSON.parse(stored) };
  } catch {
    return defaultData;
  }
}

export function useWizardState(userId: string | undefined) {
  const [data, setData] = useState<WizardData>(() => loadData(userId));

  const update = useCallback(
    (updates: Partial<WizardData>) => {
      setData((prev) => {
        const next = { ...prev, ...updates };
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
        return next;
      });
    },
    [userId],
  );

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey(userId));
    setData(defaultData);
  }, [userId]);

  return { data, update, reset };
}
