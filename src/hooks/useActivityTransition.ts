import { useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from './useTheme';

/** Fade out only the outgoing view; rapid updates replace the pending target. */
export function useActivityTransition<T>(target: T) {
  const { reducedMotion } = useTheme();
  const [displayed, setDisplayed] = useState(target);
  const [leaving, setLeaving] = useState(false);
  const latest = useRef(target);
  latest.current = target;
  useLayoutEffect(() => {
    if (reducedMotion || Object.is(displayed, target)) {
      setLeaving(false);
      if (!Object.is(displayed, target)) setDisplayed(target);
      return;
    }
    setLeaving(true);
    const timer = window.setTimeout(() => { setDisplayed(latest.current); setLeaving(false); }, 90);
    return () => clearTimeout(timer);
  }, [target, displayed, reducedMotion]);
  return { displayed, leaving, pending: !Object.is(displayed, target) };
}
