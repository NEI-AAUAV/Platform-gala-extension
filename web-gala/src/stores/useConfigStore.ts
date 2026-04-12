import { create } from "zustand";
import GalaService from "@/services/GalaService";

interface ConfigStore {
  raw: Record<string, unknown> | null;
  loading: boolean;
  fetch: () => Promise<void>;
  save: (patch: Record<string, unknown>) => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  raw: null,
  loading: true,

  fetch: async () => {
    set({ loading: true });
    try {
      const data = await GalaService.config.getConfig();
      set({ raw: data });
    } finally {
      set({ loading: false });
    }
  },

  save: async (patch: Record<string, unknown>) => {
    const current = get().raw ?? {};
    const merged = deepMerge(current, patch);
    set({ raw: merged });
    await GalaService.config.updateConfig(merged);
  },
}));

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = base[key];
    if (isObject(pv) && isObject(bv)) {
      result[key] = deepMerge(bv, pv);
    } else {
      result[key] = pv;
    }
  }
  return result;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
