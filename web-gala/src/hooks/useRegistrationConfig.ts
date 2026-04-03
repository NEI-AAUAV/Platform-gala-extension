import { useState } from "react";
import { RegistrationConfig, defaultConfig } from "@/config/registrationConfig";

const STORAGE_KEY = "gala-registration-config";

function loadConfig(): RegistrationConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultConfig;
    return { ...defaultConfig, ...JSON.parse(stored) };
  } catch {
    return defaultConfig;
  }
}

export function useRegistrationConfig() {
  const [config, setConfig] = useState<RegistrationConfig>(loadConfig);

  const updateConfig = (updates: Partial<RegistrationConfig>) => {
    const next = { ...config, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConfig(next);
  };

  const resetConfig = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(defaultConfig);
  };

  return { config, updateConfig, resetConfig };
}
