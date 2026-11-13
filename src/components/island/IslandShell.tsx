import { useEffect, useRef } from "react";
import type { PropsWithChildren } from "react";
import { Icon } from "../Icon";
import { MODULES } from "../../data/defaults";
import type { IslandController } from "../../hooks/useDynamicIsland";
import { formatTime } from "../../hooks/useDynamicIsland";
import { AlbumArt } from "../modules/MediaModule";
import { useClock } from "../modules/ClockModule";
import { useHold } from '../../hooks/useHold';
import { useActivityTransition } from '../../hooks/useActivityTransition';

export function IslandShell({
  island,
  children,
}: PropsWithChildren<{ island: IslandController }>) {
  const trigger = useRef<HTMLButtonElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const wasExpanded = useRef(island.expanded);
  const heading = useActivityTransition(island.active);
  const shownActive = heading.displayed;
  const module = MODULES.find((module) => module.id === shownActive);
  const idle = island.state === "idle";
  const date = useClock();
  const gesture = useHold(() => { if (!island.expanded) island.toggleExpanded(); }, island.toggleExpanded, direction => {
    const index = island.enabled.indexOf(island.active as typeof island.enabled[number]);
    const next = island.enabled[(index + direction + island.enabled.length) % island.enabled.length];
    if (next) island.select(next, false);
  });
  const label =
    island.active === "call"
      ? island.callStatus === "ringing"
        ? "Incoming call"
        : island.callStatus === "active"
          ? "Call in progress"
          : "Call ended"
      : module?.title;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && island.expanded) {
        island.collapse();
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [island.expanded, island.collapse]);
  useEffect(() => {
    if (
      wasExpanded.current &&
      !island.expanded &&
      shell.current?.contains(document.activeElement)
    )
      trigger.current?.focus();
    wasExpanded.current = island.expanded;
  }, [island.expanded]);
  const compactLabel = idle
    ? "Island is resting"
    : shownActive === "clock"
      ? date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : shownActive === "media"
      ? island.track.title
      : shownActive === "timer"
        ? formatTime(
            island.timerMode === "timer"
              ? island.timerRemaining
              : island.stopwatch,
          )
        : island.primaryActivity?.detail ?? label;
  return (
    <div
      ref={shell}
      data-hit-region="true"
      className={`island-shell ${island.expanded ? "expanded" : "compact"} ${island.clockOnly ? 'clock-only' : ''} ${idle ? "idle" : ""}`}
      data-state={island.state}
      onPointerDownCapture={island.touch}
      onKeyDownCapture={island.touch}
      onPointerEnter={island.hidden ? island.touch : undefined}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty('--light-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
        event.currentTarget.style.setProperty('--light-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
      }}
    >
      <div className="glass-reflections" aria-hidden="true" />
      <button
        ref={trigger}
        className="island-trigger"
        aria-label={`${island.expanded ? "Collapse" : "Expand"} ${label ?? "island"}`}
        aria-expanded={island.expanded}
        aria-controls="island-content"
        {...gesture}
      >
        <span className={`trigger-expanded trigger-view ${heading.leaving ? 'heading-leaving' : ''}`} aria-hidden="true">
            <span className="island-status">
              <i
                className={
                  island.active === "recording" && island.recording ? "red" : ""
                }
              />
              {island.active === "media" ? "NOW PLAYING" : label?.toUpperCase()}
            </span>
            <Icon name="up" size={15} />
        </span>
        <span className={`trigger-compact trigger-view ${heading.leaving ? 'heading-leaving' : ''}`} aria-hidden="true">
            {!island.clockOnly && <span className="compact-leading">
              {shownActive === "media" && !idle ? (
                <AlbumArt color={island.track.color} artwork={island.track.artwork} small />
              ) : (
                <Icon
                  name={idle ? "sparkle" : (module?.icon ?? "phone")}
                  size={19}
                />
              )}
            </span>}
            <span className="compact-label">{compactLabel}</span>
            {!island.clockOnly && (shownActive === "media" && !idle ? (
              <span
                className={`equalizer compact-eq ${island.playing ? "is-playing" : ""}`}
              >
                <i />
                <i />
                <i />
                <i />
              </span>
            ) : island.active === "notifications" &&
              island.notifications.length > 0 ? (
              <b className="notification-count">
                {island.notifications.length}
              </b>
            ) : (
              <span className="compact-dot" />
            ))}
        </span>
      </button>
      {(
        <div
          inert={!island.expanded}
          aria-hidden={!island.expanded}
          id="island-content"
          className="island-content"
          role="region"
          aria-label={label}
        >
          {children}
          <div className="island-module-tabs" aria-label="Island modules">
            {island.enabled.map((id) => {
              const definition = MODULES.find((module) => module.id === id)!;
              return (
                <button
                  key={id}
                  className={island.active === id ? "active" : ""}
                  aria-label={`Open ${definition.title}`}
                  aria-pressed={island.active === id}
                  onClick={() => island.select(id)}
                  title={definition.title}
                >
                  <Icon name={definition.icon} size={16} />
                  {id === "notifications" &&
                    island.notifications.length > 0 && (
                      <span className="tab-badge" />
                    )}
                </button>
              );
            })}
            {window.desktop && <button className="desktop-settings-button" aria-label="Настройки" title="Настройки" onClick={() => window.desktop?.openSettings()}><Icon name="sliders" size={16} /></button>}
          </div>
        </div>
      )}
    </div>
  );
}
