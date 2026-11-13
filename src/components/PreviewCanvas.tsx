import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { DynamicIsland } from "./island/DynamicIsland";
import type { IslandController } from "../hooks/useDynamicIsland";

export function PreviewCanvas({ island }: { island: IslandController }) {
  const [fullScreen, setFullScreen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [backdrop, setBackdrop] = useState<"landscape" | "mesh" | "minimal">(
    "landscape",
  );
  const expandButton = useRef<HTMLButtonElement>(null);
  const previewRegion = useRef<HTMLElement>(null);
  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!fullScreen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    expandButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullScreen(false);
        expandButton.current?.focus();
      }
      if (event.key === "Tab") {
        const controls = previewRegion.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        );
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullScreen]);
  const time = clock.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return (
    <section
      id="preview"
      ref={previewRegion}
      className={`preview-wrap ${fullScreen ? "fullscreen" : ""}`}
      role={fullScreen ? "dialog" : "region"}
      aria-modal={fullScreen || undefined}
      aria-label="Live interactive preview"
    >
      <div
        className={`preview-canvas ${backdrop} ${island.flashlight ? "flashlight-on" : ""}`}
      >
        <div className="preview-menubar">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>YOUR LITTLE CORNER OF CALM</span>
          <div className="preview-system">
            <span>{time}</span>
            <Icon name="battery" size={18} />
          </div>
        </div>
        <DynamicIsland island={island} />
        <div className="landscape-caption">
          <span>LESS NOISE. MORE NOW.</span>
          <p>Stay in your flow.</p>
        </div>
        <div className="canvas-bottom">
          <div className="wallpaper-options" aria-label="Preview wallpaper">
            {(["landscape", "mesh", "minimal"] as const).map((id) => (
              <button
                key={id}
                className={`${id} ${backdrop === id ? "selected" : ""}`}
                onClick={() => setBackdrop(id)}
                aria-label={`${id} wallpaper`}
                aria-pressed={backdrop === id}
              />
            ))}
          </div>
          <button
            ref={expandButton}
            className="canvas-expand"
            aria-label={
              fullScreen ? "Exit full screen preview" : "Expand preview"
            }
            onClick={() => setFullScreen(!fullScreen)}
          >
            <Icon name={fullScreen ? "close" : "external"} size={16} />
          </button>
        </div>
      </div>
      <div className="preview-bottom-bar">
        <span>
          <i /> LIVE PREVIEW
          <span className="preview-mode">
            {island.state === "compact"
              ? "Compact"
              : island.state === "idle"
                ? "Resting"
                : "Expanded"}
          </span>
        </span>
        <div className="preview-segment" aria-label="Island display mode">
          <button
            aria-pressed={!island.expanded}
            className={!island.expanded ? "selected" : ""}
            onClick={() => {
              if (island.expanded) island.toggleExpanded();
              else island.touch();
            }}
          >
            Compact
          </button>
          <button
            aria-pressed={island.expanded}
            className={island.expanded ? "selected" : ""}
            onClick={() => {
              if (!island.expanded) island.toggleExpanded();
            }}
          >
            Expanded
          </button>
        </div>
        <span className="preview-key-hint">
          Click to explore <kbd>esc</kbd> to close
        </span>
      </div>
    </section>
  );
}
