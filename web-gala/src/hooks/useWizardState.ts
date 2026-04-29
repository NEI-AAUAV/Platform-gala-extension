import { useState } from "react";

export interface Companion {
  name: string;
  meal: string;
  allergies: string;
}

export type BusOption = "round_trip" | "one_way" | "none";

export interface WizardData {
  nmec: string;
  year: number | null;
  bus: BusOption;
  meal: string;
  allergies: string;
  companions: Companion[];
  phasedPayment: boolean;
  paymentProofPhase1: string | null;
  paymentProofPhase2: string | null;
  tableId: string | null;
  tableRole: "owner" | "member" | null;
  tableName: string | undefined;
  currentStep: number;
}

const STORAGE_KEY = "gala-wizard-state";

const defaultData: WizardData = {
  nmec: "",
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

function loadData(): WizardData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultData;
    return { ...defaultData, ...JSON.parse(stored) };
  } catch {
    return defaultData;
  }
}

export function useWizardState() {
  const [data, setData] = useState<WizardData>(loadData);

  const update = (updates: Partial<WizardData>) => {
    const next = { ...data, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setData(next);
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData(defaultData);
  };

  return { data, update, reset };
}
