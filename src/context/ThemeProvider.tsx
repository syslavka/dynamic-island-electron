import { createContext, useContext, useEffect, useState } from "react";
import type { CSSProperties, PropsWithChildren } from "react";
import { useSettings } from "../hooks/useSettings";

const ThemeContext = createContext({ dark: false, reducedMotion: false });
export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [systemReduced, setSystemReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const color = matchMedia("(prefers-color-scheme: dark)");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const onColor = () => setSystemDark(color.matches);
    const onMotion = () => setSystemReduced(motion.matches);
    color.addEventListener("change", onColor);
    motion.addEventListener("change", onMotion);
    return () => {
      color.removeEventListener("change", onColor);
      motion.removeEventListener("change", onMotion);
    };
  }, []);
  const dark =
    settings.theme === "dark" || settings.theme === "glass" || (settings.theme === "auto" && systemDark);
  const reducedMotion = settings.reducedMotion || systemReduced;
  const style = {
    "--accent": settings.accent,
    "--island-blur": `${reducedMotion ? Math.min(12, settings.blur) : settings.blur}px`,
    "--island-opacity": settings.opacity / 100,
    "--glass-strength": settings.glass / 100,
    "--motion-duration": reducedMotion ? "0.01ms" : `${460 / settings.speed}ms`,
    "--island-scale": settings.scale / 100,
    "--island-offset": `${settings.topOffset}px`,
  } as CSSProperties;
  return (
    <ThemeContext.Provider value={{ dark, reducedMotion }}>
      <div
        className="theme-root"
        data-theme={dark ? "dark" : "light"}
        data-island-theme={settings.theme}
        data-reduced-motion={reducedMotion}
        style={style}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
