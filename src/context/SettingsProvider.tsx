import { createContext, useCallback, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { DEFAULT_SETTINGS, STORAGE_KEY } from "../data/defaults";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { ModuleId, Settings } from "../types";
import { validateSettings } from "./settingsValidation";

interface SettingsContextValue {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggleModule: (id: ModuleId) => void;
  moveModule: (id: ModuleId, direction: -1 | 1) => void;
  reset: () => void;
  storageAvailable: boolean;
}
const SettingsContext = createContext<SettingsContextValue | null>(null);
export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings, storageAvailable] = useLocalStorage(
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    validateSettings,
  );
  const update = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      setSettings((previous) => ({ ...previous, [key]: value })),
    [setSettings],
  );
  const toggleModule = useCallback(
    (id: ModuleId) =>
      setSettings((previous) => ({
        ...previous,
        modules: previous.modules.map((module) =>
          module.id === id && id !== 'clock' ? { ...module, enabled: !module.enabled } : module,
        ),
      })),
    [setSettings],
  );
  const moveModule = useCallback(
    (id: ModuleId, direction: -1 | 1) =>
      setSettings((previous) => {
        const modules = [...previous.modules];
        const from = modules.findIndex((module) => module.id === id);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= modules.length) return previous;
        [modules[from], modules[to]] = [modules[to], modules[from]];
        return { ...previous, modules };
      }),
    [setSettings],
  );
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings]);
  const value = useMemo(
    () => ({
      settings,
      update,
      toggleModule,
      moveModule,
      reset,
      storageAvailable,
    }),
    [settings, update, toggleModule, moveModule, reset, storageAvailable],
  );
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be inside SettingsProvider");
  return context;
}
