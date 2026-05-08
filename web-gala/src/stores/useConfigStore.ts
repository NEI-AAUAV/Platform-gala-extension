import { create } from "zustand";
import GalaService from "@/services/GalaService";

interface ConfigStore {
  raw: Record<string, unknown> | null;
  loading: boolean;
  saving: boolean;
  fetch: () => Promise<void>;
  save: (patch: Record<string, unknown>) => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  raw: null,
  loading: false,
  saving: false,

  fetch: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await GalaService.config.getConfig();
      set({ raw: data });
    } finally {
      set({ loading: false });
    }
  },

  save: async (patch: Record<string, unknown>) => {
    const previous = get().raw ?? {};
    const merged = deepMerge(previous, patch);
    set({ raw: merged, saving: true });
    try {
      const updated = await GalaService.config.updateConfig(merged);
      set({ raw: updated });
    } catch (e) {
      set({ raw: previous });
      throw e;
    } finally {
      set({ saving: false });
    }
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
