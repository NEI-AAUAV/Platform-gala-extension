import { useEffect } from "react";
import { useConfigStore } from "@/stores/useConfigStore";

export interface DJConfig {
  visible: boolean;
  name: string;
  bio: string;
  photo_url: string | null;
  spotify_url: string | null;
}

export interface BusVehicle {
  id: string;
  name: string;
  capacity: number;
}

export interface BusScheduleConfig {
  visible: boolean;
  departure_location: string;
  departure_time: string;
  return_time: string;
  buses: BusVehicle[];
}

export interface AfterPartyConfig {
  visible: boolean;
  title: string;
  description: string;
  drinks: string[];
}

export interface GalleryConfig {
  visible: boolean;
  title: string;
  description: string;
  drive_url: string;
  preview_photo_url: string | null;
}

export interface NominationsDisplayConfig {
  visible: boolean;
  show_nominees: boolean;
}

export interface PaymentInfoConfig {
  visible: boolean;
}

export interface HomepageConfig {
  dj: DJConfig;
  bus_schedule: BusScheduleConfig;
  after_party: AfterPartyConfig;
  gallery: GalleryConfig;
  nominations_display: NominationsDisplayConfig;
  payment_info: PaymentInfoConfig;
}

const defaults: HomepageConfig = {
  dj: { visible: false, name: "", bio: "", photo_url: null, spotify_url: null },
  bus_schedule: { visible: false, departure_location: "", departure_time: "", return_time: "", buses: [] },
  after_party: { visible: false, title: "After Party", description: "", drinks: [] },
  gallery: { visible: false, title: "Galeria", description: "", drive_url: "", preview_photo_url: null },
  nominations_display: { visible: false, show_nominees: false },
  payment_info: { visible: true },
};

function extract(raw: Record<string, unknown>): HomepageConfig {
  const hp = (raw.homepage as Partial<HomepageConfig>) ?? {};
  return {
    dj: { ...defaults.dj, ...hp.dj },
    bus_schedule: { ...defaults.bus_schedule, ...hp.bus_schedule },
    after_party: { ...defaults.after_party, ...hp.after_party },
    gallery: { ...defaults.gallery, ...hp.gallery },
    nominations_display: { ...defaults.nominations_display, ...hp.nominations_display },
    payment_info: { ...defaults.payment_info, ...hp.payment_info },
  };
}

export function useHomepageConfig() {
  const { raw, loading, fetch, save } = useConfigStore();

  useEffect(() => {
    if (!raw) fetch();
  }, [raw, fetch]);

  const config: HomepageConfig = raw ? extract(raw) : defaults;

  const updateSection = <K extends keyof HomepageConfig>(
    section: K,
    updates: Partial<HomepageConfig[K]>,
  ) => {
    const current = raw ? extract(raw) : defaults;
    const next: HomepageConfig = {
      ...current,
      [section]: { ...current[section], ...updates },
    };
    save({ homepage: next });
  };

  return { config, updateSection, loading };
}
