import { describe, expect, it } from "vitest";
import { validateSettings } from "../context/settingsValidation";
import { DEFAULT_SETTINGS, MODULES } from "../data/defaults";

describe("restoring settings from untrusted localStorage", () => {
  it('migrates saved auto-hide preferences to a permanently visible island', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, autoHide: true }).autoHide).toBe(false);
  });
  it.each([null, undefined, false, 42, "broken"])(
    "restores defaults for %s",
    (value) => {
      expect(validateSettings(value)).toEqual(DEFAULT_SETTINGS);
    },
  );
  it("preserves a complete saved configuration and module order", () => {
    const saved = {
      ...DEFAULT_SETTINGS,
      theme: "dark",
      blur: 32,
      reducedMotion: true,
      modules: [...DEFAULT_SETTINGS.modules].reverse(),
    };
    expect(validateSettings(saved)).toEqual(saved);
  });
  it("bounds numeric settings and rejects invalid values without losing zero", () => {
    const restored = validateSettings({
      blur: 0,
      opacity: -100,
      scale: 500,
      speed: NaN,
      topOffset: Infinity,
    });
    expect(restored.blur).toBe(0);
    expect(restored.opacity).toBe(40);
    expect(restored.scale).toBe(115);
    expect(restored.speed).toBe(DEFAULT_SETTINGS.speed);
    expect(restored.topOffset).toBe(DEFAULT_SETTINGS.topOffset);
  });
  it("deduplicates modules, drops unknown IDs, and migrates missing modules", () => {
    const restored = validateSettings({
      modules: [
        { id: "weather", enabled: false },
        { id: "weather", enabled: true },
        { id: "unknown", enabled: true },
        null,
      ],
    });
    expect(restored.modules[0]).toEqual({ id: "weather", enabled: false });
    expect(restored.modules).toHaveLength(MODULES.length);
    expect(new Set(restored.modules.map((module) => module.id)).size).toBe(
      MODULES.length,
    );
  });
  it("rejects invalid colors and enum values", () => {
    const restored = validateSettings({
      accent: "url(javascript:bad)",
      theme: "unknown",
      notificationBehavior: "other",
      defaultModule: "unknown",
      autoHide: "true",
    });
    expect(restored.accent).toBe(DEFAULT_SETTINGS.accent);
    expect(restored.theme).toBe("glass");
    expect(restored.notificationBehavior).toBe("queue");
    expect(restored.defaultModule).toBe(DEFAULT_SETTINGS.defaultModule);
    expect(restored.autoHide).toBe(false);
  });
});
