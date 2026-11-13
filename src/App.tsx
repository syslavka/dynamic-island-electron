import { useEffect, useState } from "react";
import { DynamicIsland } from "./components/island/DynamicIsland";
import { Slider, Toggle } from "./components/Controls";
import { Icon } from "./components/Icon";
import { useDynamicIsland } from "./hooks/useDynamicIsland";
import { useSettings } from "./hooks/useSettings";
import { ACCENTS, DESKTOP_MODULES } from "./data/defaults";
import type { Theme } from "./types";
import type { SystemInfo } from "./desktop";

const isSettings = new URLSearchParams(location.search).get("window") === "settings";
document.documentElement.dataset.window = isSettings ? "settings" : "overlay";
document.title = isSettings ? "Dynamic Island — Настройки" : "Dynamic Island";

function DesktopOverlay() {
  const island = useDynamicIsland();
  useEffect(() => {
    let previous = "";
    const report = () => {
      const regions = Array.from(document.querySelectorAll<HTMLElement>('[data-hit-region="true"]')).map((element) => {
        const rect = element.getBoundingClientRect();
        const scale = element.offsetWidth ? rect.width / element.offsetWidth : 1;
        const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius);
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, radius: Number.isFinite(radius) ? radius * scale : Math.min(rect.width, rect.height) / 2 };
      }).filter(region => region.width > .1 && region.height > .1);
      const serialized = JSON.stringify(regions);
      if (serialized !== previous) { previous = serialized; window.desktop?.setRegions(regions); }
    };
    report();
    let frame = 0;
    const tick = () => { report(); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="desktop-overlay"><DynamicIsland island={island} /></div>;
}

function DesktopSettings() {
  const { settings, update, reset, toggleModule, storageAvailable } = useSettings();
  const [tab, setTab] = useState<"appearance" | "system">("appearance");
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { window.desktop?.getSystem().then(setSystem).catch(() => setSystem(null)); }, []);
  const autostart = async () => {
    if (!system || busy) return;
    setBusy(true); setError(false);
    try { setSystem({ ...system, autostart: await window.desktop!.setAutostart(!system.autostart) }); }
    catch { setError(true); }
    finally { setBusy(false); }
  };
  return (
    <div className="desktop-settings">
      <header className="desktop-heading">
        <span className="desktop-logo"><i /></span>
        <div><h1>Dynamic Island</h1><p>Маленький остров на вашем экране.</p></div>
        <span className="desktop-live"><i /> Работает</span>
      </header>
      <div className="desktop-tabs" role="tablist" aria-label="Настройки">
        <button role="tab" aria-selected={tab === "appearance"} id="appearance-tab" aria-controls="appearance-panel" onClick={() => setTab("appearance")}>Внешний вид</button>
        <button role="tab" aria-selected={tab === "system"} id="system-tab" aria-controls="system-panel" onClick={() => setTab("system")}>Поведение и система</button>
      </div>
      <section className="desktop-card" role="tabpanel" id={`${tab}-panel`} aria-labelledby={`${tab}-tab`}>
        {tab === "appearance" ? <>
          <h2>Поверх вашего рабочего стола</h2>
          <p className="desktop-description">Изменения сразу применяются к острову.</p>
          <div className="desktop-theme-options">
            {([{ id: "glass", label: "Стекло" }, { id: "dark", label: "Тёмная" }, { id: "light", label: "Светлая" }, { id: "auto", label: "Системная" }] as { id: Theme; label: string }[]).map(({ id, label }) => (
              <button key={id} className={settings.theme === id ? "selected" : ""} aria-pressed={settings.theme === id} onClick={() => update("theme", id)}><span className={`desktop-theme-preview ${id}`}><i /></span>{label}</button>
            ))}
          </div>
          <div className="desktop-field-label">Акцент</div>
          <div className="accent-options">{ACCENTS.map((color) => <button key={color} style={{ background: color }} className={settings.accent === color ? "selected" : ""} aria-label={`Цвет ${color}`} aria-pressed={settings.accent === color} onClick={() => update("accent", color)}>{settings.accent === color && <Icon name="check" size={14} />}</button>)}</div>
          <Slider label="Размер острова" min={80} max={115} value={settings.scale} unit="%" onChange={(value) => update("scale", value)} />
          <Slider label="Отступ сверху" min={20} max={110} value={settings.topOffset} unit=" px" onChange={(value) => update("topOffset", value)} />
          <Slider label="Непрозрачность стекла" min={40} max={100} value={settings.opacity} unit="%" onChange={(value) => update("opacity", value)} />
          {settings.theme === 'glass' && <><Slider label="Мягкость поверхности" min={0} max={48} value={settings.blur} onChange={value => update('blur', value)} /><Slider label="Световой край" min={0} max={100} value={settings.glass} unit="%" onChange={value => update('glass', value)} /><p className="desktop-description">Стекло внутри острова. Окружение полностью прозрачно; системный Acrylic отключён.</p></>}
          <div className="desktop-row"><div>Меньше анимации<p>Быстрые, спокойные переходы</p></div><Toggle label="Меньше анимации" checked={settings.reducedMotion} onChange={() => update("reducedMotion", !settings.reducedMotion)} /></div>
        </> : <>
          <h2>Всегда под рукой</h2>
          <p className="desktop-description">Клик по острову раскрывает его. Esc сворачивает.</p>
          <div className="desktop-row"><div>Сворачивать автоматически<p>Через 8 секунд без действий</p></div><Toggle label="Сворачивать автоматически" checked={settings.autoCollapse} onChange={() => update("autoCollapse", !settings.autoCollapse)} /></div>
          <div className="desktop-row"><div>Автоматически показывать музыку<p>При воспроизведении; после паузы — к прежней активности</p></div><Toggle label="Автоматически показывать музыку" checked={settings.autoMedia} onChange={() => update('autoMedia', !settings.autoMedia)} /></div>
          <p className="desktop-description">Остров всегда виден. Без активностей он показывает только время.</p>
          <div className="desktop-row"><div>Запускать вместе с Windows<p>{system?.packaged ? "Остров появится после входа в систему" : "Доступно в собранном .exe"}</p></div><Toggle label="Запускать вместе с Windows" disabled={!system?.packaged || busy} checked={system?.autostart ?? false} onChange={autostart} /></div>
          {error && <p role="alert">Не удалось изменить автозапуск. Попробуйте ещё раз.</p>}
          <div className="desktop-field-label">Модули острова</div>
          {DESKTOP_MODULES.map(({ id, title, description, icon }) => <div className="desktop-row" key={id}><Icon name={icon} size={18} /><div>{title}<p>{description}</p></div><Toggle label={title} disabled={id === 'clock'} checked={id === 'clock' || settings.modules.some((module) => module.id === id && module.enabled)} onChange={() => toggleModule(id)} /></div>)}
          <label className="desktop-field-label" htmlFor="home-module">Модуль при запуске</label>
          <select id="home-module" value={settings.defaultModule} onChange={(event) => update("defaultModule", event.target.value as typeof settings.defaultModule)}>{DESKTOP_MODULES.map(({ id, title }) => <option key={id} value={id} disabled={!settings.modules.some((module) => module.id === id && module.enabled)}>{title}</option>)}</select>
        </>}
      </section>
      <div className="desktop-shortcuts"><span><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>I</kbd> Показать остров</span><span><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>S</kbd> Настройки</span></div>
      <footer className="desktop-settings-footer"><span role="status">{storageAvailable ? "Настройки сохраняются автоматически" : "Настройки сохранены только на эту сессию"}</span><button onClick={reset}>Сбросить</button></footer>
      <p className="desktop-tray-hint">Выбор экрана и выход — через значок острова в трее Windows.</p>
    </div>
  );
}

export function App() {
  if (!window.desktop) return <div className="desktop-settings"><h1>Dynamic Island для Windows</h1><p>Откройте Dynamic Island.exe или запустите npm run dev из папки проекта.</p></div>;
  return isSettings ? <DesktopSettings /> : <DesktopOverlay />;
}
