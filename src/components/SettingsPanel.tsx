import { memo } from "react";
import { useSettings } from "../hooks/useSettings";
import { ACCENTS, MODULES } from "../data/defaults";
import { Slider, Toggle } from "./Controls";
import { Icon } from "./Icon";
import type { Theme } from "../types";

export type SettingsTab = "appearance" | "behavior";
const themes: { id: Theme; name: string; icon: string }[] = [
  { id: "glass", name: "Liquid Glass", icon: "sparkle" },
  { id: "dark", name: "Dark", icon: "moon" },
  { id: "light", name: "Light", icon: "sun" },
  { id: "auto", name: "System", icon: "monitor" },
];
export const SettingsPanel = memo(function SettingsPanel({
  tab,
  onTabChange,
  onReset,
}: {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onReset: () => void;
}) {
  const { settings, update } = useSettings();
  return (
    <aside
      className="settings-panel panel"
      id="settings"
      aria-label="Island settings"
    >
      <div className="panel-heading">
        <div className="section-icon">
          <Icon name="sliders" size={18} />
        </div>
        <h2>Make it yours</h2>
        <button
          className="icon-button reset-settings"
          aria-label="Reset all settings"
          onClick={onReset}
          title="Reset all settings"
        >
          <Icon name="reset" size={16} />
        </button>
      </div>
      <p className="panel-subtitle">Little details. Your kind of island.</p>
      <div
        className="settings-tabs"
        role="tablist"
        aria-label="Settings category"
      >
        {(["appearance", "behavior"] as const).map((id) => (
          <button
            key={id}
            id={`${id}-tab`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`${id}-panel`}
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                const next = tab === "appearance" ? "behavior" : "appearance";
                onTabChange(next);
                document.getElementById(`${next}-tab`)?.focus();
              }
            }}
            onClick={() => onTabChange(id)}
          >
            {id === "appearance" ? "Appearance" : "Behavior"}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${tab}-panel`}
        aria-labelledby={`${tab}-tab`}
        tabIndex={0}
      >
        {tab === "appearance" ? (
          <>
            <div className="setting-section">
              <div className="setting-label">
                Theme<span>SET THE MOOD</span>
              </div>
              <div className="theme-options">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    className={`theme-option ${theme.id} ${settings.theme === theme.id ? "selected" : ""}`}
                    aria-label={`${theme.name} theme`}
                    aria-pressed={settings.theme === theme.id}
                    onClick={() => update("theme", theme.id)}
                  >
                    <div className="theme-swatch">
                      <span className="theme-pill">
                        <i />
                      </span>
                      {settings.theme === theme.id && (
                        <span className="theme-check">
                          <Icon name="check" size={10} />
                        </span>
                      )}
                    </div>
                    <span>{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-section accent-section">
              <div className="setting-label">
                Accent color
                <span className="color-code">
                  {settings.accent.toUpperCase()}
                </span>
              </div>
              <div className="accent-options">
                {ACCENTS.map((color, index) => (
                  <button
                    key={color}
                    style={{ "--swatch": color } as React.CSSProperties}
                    className={settings.accent === color ? "selected" : ""}
                    aria-label={`${["Amber", "Lavender", "Sage", "Rose", "Sky", "Silver"][index]} accent`}
                    aria-pressed={settings.accent === color}
                    onClick={() => update("accent", color)}
                  >
                    {settings.accent === color && (
                      <Icon name="check" size={14} />
                    )}
                  </button>
                ))}
                <label className="custom-color" title="Custom accent">
                  <Icon name="sliders" size={15} />
                  <input
                    type="color"
                    aria-label="Custom accent color"
                    value={settings.accent}
                    onChange={(event) => update("accent", event.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="setting-section glass-settings">
              <div className="setting-label">
                Glass & texture
                <Icon name="sparkle" size={14} />
              </div>
              <Slider
                label="Background blur"
                min={0}
                max={48}
                value={settings.blur}
                unit="px"
                onChange={(value) => update("blur", value)}
              />
              <Slider
                label="Opacity"
                min={40}
                max={100}
                value={settings.opacity}
                unit="%"
                onChange={(value) => update("opacity", value)}
              />
              <Slider
                label="Glass intensity"
                min={0}
                max={100}
                value={settings.glass}
                unit="%"
                onChange={(value) => update("glass", value)}
              />
              <div className="setting-tip">
                <Icon name="info" size={14} />
                <span>Glass comes to life against your wallpaper.</span>
              </div>
            </div>
            <details className="advanced-settings">
              <summary>
                Size & position
                <Icon name="down" size={14} />
              </summary>
              <Slider
                label="Island scale"
                min={80}
                max={115}
                value={settings.scale}
                unit="%"
                onChange={(value) => update("scale", value)}
              />
              <Slider
                label="Top spacing"
                min={20}
                max={110}
                value={settings.topOffset}
                unit="px"
                onChange={(value) => update("topOffset", value)}
              />
            </details>
          </>
        ) : (
          <>
            <div className="setting-section">
              <div className="setting-label">
                Motion<span>KEEP IT NATURAL</span>
              </div>
              <Slider
                label="Animation speed"
                min={0.5}
                max={2}
                step={0.1}
                value={settings.speed}
                unit="×"
                onChange={(value) => update("speed", value)}
              />
              <div className="behavior-row">
                <div>
                  Reduced motion<p>Gentler transitions, less blur</p>
                </div>
                <Toggle
                  label="Reduced motion"
                  checked={settings.reducedMotion}
                  onChange={() =>
                    update("reducedMotion", !settings.reducedMotion)
                  }
                />
              </div>
              <div className="setting-tip">
                <Icon name="info" size={14} />
                <span>
                  Your system’s reduced motion preference is always respected.
                </span>
              </div>
            </div>
            <div className="setting-section">
              <div className="setting-label">Give it some space</div>
              <div className="behavior-row">
                <div>
                  Auto-collapse<p>Close after 8 seconds of inactivity</p>
                </div>
                <Toggle
                  label="Auto-collapse"
                  checked={settings.autoCollapse}
                  onChange={() =>
                    update("autoCollapse", !settings.autoCollapse)
                  }
                />
              </div>
              <div className="behavior-row">
                <div>
                  Auto-hide when idle
                  <p>Rest after 5 seconds without activity</p>
                </div>
                <Toggle
                  label="Auto-hide"
                  checked={settings.autoHide}
                  onChange={() => update("autoHide", !settings.autoHide)}
                />
              </div>
            </div>
            <div className="setting-section">
              <label className="setting-label" htmlFor="notification-behavior">
                Notifications
              </label>
              <select
                id="notification-behavior"
                value={settings.notificationBehavior}
                onChange={(event) =>
                  update(
                    "notificationBehavior",
                    event.target.value as typeof settings.notificationBehavior,
                  )
                }
              >
                <option value="queue">Queue · One at a time</option>
                <option value="replace">Replace · Latest only</option>
                <option value="stack">Stack · Show together</option>
              </select>
              <p className="field-hint">
                Send a few notifications to see the difference.
              </p>
            </div>
            <div className="setting-section">
              <label className="setting-label" htmlFor="default-module">
                Default module
              </label>
              <select
                id="default-module"
                value={settings.defaultModule}
                onChange={(event) =>
                  update(
                    "defaultModule",
                    event.target.value as typeof settings.defaultModule,
                  )
                }
              >
                {MODULES.map((module) => (
                  <option
                    key={module.id}
                    value={module.id}
                    disabled={
                      !settings.modules.find((item) => item.id === module.id)
                        ?.enabled
                    }
                  >
                    {module.title}
                  </option>
                ))}
              </select>
              <p className="field-hint">
                Your island’s home when you come back.
              </p>
            </div>
          </>
        )}
      </div>
      <div className="settings-footer">
        <Icon name="check" size={13} />
        <span>Made for the way you flow.</span>
      </div>
    </aside>
  );
});
