import { DEFAULT_SETTINGS, MODULES } from "../data/defaults";
import type { Settings } from "../types";

export function validateSettings(value: unknown): Settings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  const raw = value as Record<string, unknown>;
  const validIds = MODULES.map((module) => module.id);
  const number = (key: keyof Settings, min: number, max: number) =>
    typeof raw[key] === "number" && Number.isFinite(raw[key])
      ? Math.max(min, Math.min(max, raw[key] as number))
      : (DEFAULT_SETTINGS[key] as number);
  const boolean = (key: keyof Settings) =>
    typeof raw[key] === "boolean"
      ? (raw[key] as boolean)
      : (DEFAULT_SETTINGS[key] as boolean);
  const seen = new Set<string>();
  const modules = (Array.isArray(raw.modules) ? raw.modules : []).flatMap(
    (item) => {
      if (
        !item ||
        typeof item !== "object" ||
        !validIds.includes(item.id) ||
        seen.has(item.id)
      )
        return [];
      seen.add(item.id);
      return [
        {
          id: item.id,
          enabled: item.id === 'clock' || (typeof item.enabled === "boolean" ? item.enabled : true),
        },
      ];
    },
  );
  for (const id of validIds)
    if (!seen.has(id)) modules.push({ id, enabled: true });
  return {
    version: 1,
    theme: ["glass", "dark", "light", "auto"].includes(raw.theme as string)
      ? (raw.theme as Settings["theme"])
      : "glass",
    accent:
      typeof raw.accent === "string" && /^#[0-9a-f]{6}$/i.test(raw.accent)
        ? raw.accent
        : DEFAULT_SETTINGS.accent,
    blur: number("blur", 0, 48),
    opacity: number("opacity", 40, 100),
    glass: number("glass", 0, 100),
    speed: number("speed", 0.5, 2),
    scale: number("scale", 80, 115),
    topOffset: number("topOffset", 20, 110),
    autoCollapse: boolean("autoCollapse"),
    autoMedia: boolean("autoMedia"),
    autoHide: false,
    reducedMotion: boolean("reducedMotion"),
    notificationBehavior: ["queue", "replace", "stack"].includes(
      raw.notificationBehavior as string,
    )
      ? (raw.notificationBehavior as Settings["notificationBehavior"])
      : "queue",
    defaultModule: validIds.includes(
      raw.defaultModule as Settings["defaultModule"],
    )
      ? (raw.defaultModule as Settings["defaultModule"])
      : DEFAULT_SETTINGS.defaultModule,
    modules,
  };
}
