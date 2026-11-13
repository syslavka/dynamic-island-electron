import { useEffect, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? validate(JSON.parse(saved)) : fallback;
    } catch {
      return fallback;
    }
  });
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => window.desktop?.onSettings((serialized) => {
    try {
      const next = validate(JSON.parse(serialized));
      setValue((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    } catch { /* Ignore malformed messages. */ }
  }), [validate]);
  // Persist after React commits, keeping state updaters pure under StrictMode.
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
    window.desktop?.publishSettings(JSON.stringify(value));
  }, [key, value]);
  return [value, setValue, storageAvailable] as const;
}
