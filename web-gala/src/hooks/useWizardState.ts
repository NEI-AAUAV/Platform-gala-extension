import { useState, useCallback } from "react";

export interface Companion {
  id?: string;
  name: string;
  email: string;
  meal: string;
  allergies: string;
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
const STORAGE_VERSION = "2026";

const defaultData: WizardData = {
  nmec: "",
  phone: "",
  year: null,
  bus: "round_trip",
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

const TRANSIENT_FIELDS: (keyof WizardData)[] = [
  "paymentProofPhase1",
  "paymentProofPhase2",
];

function storageKey(userId: string | undefined): string {
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX;
}

function loadData(userId: string | undefined): WizardData {
  try {
    const stored = localStorage.getItem(storageKey(userId));
    if (!stored) return defaultData;
    const parsed = JSON.parse(stored);
    if (parsed._version !== STORAGE_VERSION) return defaultData;
    const data = { ...defaultData, ...parsed };
    TRANSIENT_FIELDS.forEach((f) => {
      (data as Record<string, unknown>)[f] = null;
    });
    return data;
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
        const toStore: Record<string, unknown> = {
          ...next,
          _version: STORAGE_VERSION,
        };
        TRANSIENT_FIELDS.forEach((f) => delete toStore[f]);
        localStorage.setItem(storageKey(userId), JSON.stringify(toStore));
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
