import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivitySnapshot } from '../desktop';

export function applicationName(raw: string) {
  const decoded = raw.replace(/#/g, '\\');
  const last = decoded.split('\\').filter(Boolean).at(-1) ?? raw;
  return last.replace(/\.exe$/i, '').slice(0, 70);
}

export function useSystemActivity(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<ActivitySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    alive.current = true;
    let disposed = false;
    let timeout = 0;
    if (!enabled) setSnapshot(null);
    const refresh = async () => {
      const version = generation.current;
      try {
        const value = await window.desktop?.getActivities();
        if (!disposed && value && version === generation.current) setSnapshot(previous => {
          const ownWindow = value.foreground?.title.startsWith('Dynamic Island');
          return ownWindow && previous?.foreground ? { ...value, foreground: previous.foreground } : value;
        });
      } catch { if (!disposed) setSnapshot(null); }
      if (!disposed) timeout = window.setTimeout(refresh, 1800);
    };
    if (enabled && window.desktop) void refresh();
    return () => { disposed = true; alive.current = false; clearTimeout(timeout); };
  }, [enabled]);
  const setMute = useCallback(async (muted: boolean, endpoint: 'render' | 'capture' = 'render') => {
    setBusy(true); setError(null); generation.current++;
    try {
      const result = await window.desktop?.setSystemMute(muted, endpoint);
      if (!result?.ok) throw new Error('Windows не удалось изменить состояние звука.');
      const value = await window.desktop?.getActivities();
      if (alive.current && value) setSnapshot(value);
    } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : 'Команда недоступна.'); }
    finally { if (alive.current) setBusy(false); }
  }, []);
  return { snapshot, error, busy, setMute };
}
