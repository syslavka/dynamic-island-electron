import { useEffect, useRef } from 'react';

/** Pointer capture makes a cancelled/outside release safe; click still serves keyboard users. */
export function useHold(open: () => void, click: () => void = open, swipe?: (direction: -1 | 1) => void) {
  const timeout = useRef(0);
  const held = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cancel = () => clearTimeout(timeout.current);
  useEffect(() => cancel, []);
  return {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      held.current = false;
      start.current = { x: event.clientX, y: event.clientY };
      cancel();
      timeout.current = window.setTimeout(() => { held.current = true; open(); }, 360);
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 12) { held.current = true; cancel(); }
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      cancel();
      if (start.current) {
        const dx = event.clientX - start.current.x;
        if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(event.clientY - start.current.y) * 1.5) swipe?.(dx < 0 ? 1 : -1);
      }
      start.current = null;
    },
    onPointerCancel: () => { held.current = true; start.current = null; cancel(); },
    onLostPointerCapture: cancel,
    onClick: (event: React.MouseEvent<HTMLElement>) => { cancel(); if (event.detail === 0 || !held.current) click(); held.current = false; },
  };
}
