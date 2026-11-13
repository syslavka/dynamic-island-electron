import { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeMedia } from '../desktop';
import type { MediaTrack } from '../types';
export function useNativeMedia() {
  const [media, setMedia] = useState<NativeMedia>({ available: false });
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const commandPending = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    mounted.current = true;
    let timer = 0;
    let disposed = false;
    const refresh = async () => {
      if (!inFlight.current && !commandPending.current) {
        inFlight.current = true;
        const version = revision.current;
        try { const value = await window.desktop?.media(); if (!disposed && version === revision.current && value) setMedia(value); }
        catch { if (!disposed) setMedia({ available: false, error: 'Медиасервис недоступен' }); }
        finally { inFlight.current = false; }
      }
      if (!disposed) timer = window.setTimeout(refresh, 800);
    };
    if (window.desktop) void refresh();
    return () => { disposed = true; mounted.current = false; clearTimeout(timer); };
  }, []);
  const command = useCallback(async (action: 'play' | 'pause' | 'next' | 'previous' | 'seek', position?: number) => {
    if (commandPending.current) return;
    commandPending.current = true; revision.current++; setBusy(true);
    try {
      const value = await window.desktop?.media(action, position);
      if (mounted.current && value) setMedia({ ...value, error: value.ok === false ? 'Плеер отклонил команду' : value.error });
    } catch { if (mounted.current) setMedia(value => ({ ...value, error: 'Не удалось управлять плеером' })); }
    finally { commandPending.current = false; if (mounted.current) setBusy(false); }
  }, []);
  const track: MediaTrack = { id: `${media.source}:${media.title}`, title: media.title || 'Ничего не играет', artist: media.artist || (media.available ? 'Неизвестный исполнитель' : 'Включите музыку в плеере'), album: media.album || '', duration: media.duration || 0, color: 'native-art', artwork: media.artwork };
  return { media, busy, command, track };
}
