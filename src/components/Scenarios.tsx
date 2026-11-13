import { Icon } from "./Icon";
import type { IslandController } from "../hooks/useDynamicIsland";
import { useTheme } from "../hooks/useTheme";

export function Scenarios({ island }: { island: IslandController }) {
  const { reducedMotion } = useTheme();
  const scenarios = [
    {
      id: "media",
      icon: "music",
      title: "A little soundtrack",
      detail: "Music & media",
      onClick: () => {
        island.select("media");
        island.setPlaying(true);
      },
    },
    {
      id: "call",
      icon: "phone",
      title: "Someone’s calling",
      detail: "Incoming call",
      onClick: island.startCall,
    },
    {
      id: "timer",
      icon: "timer",
      title: "Find your focus",
      detail: "Focus timer",
      onClick: () => island.select("timer"),
    },
    {
      id: "notifications",
      icon: "bell",
      title: "A gentle heads-up",
      detail: "Notification",
      onClick: island.notify,
    },
  ];
  return (
    <section className="scenarios" aria-labelledby="scenarios-title">
      <div className="scenarios-heading">
        <h2 id="scenarios-title">Meet your island</h2>
        <span>
          Pick a moment. See it come to life.
          <Icon name="arrow" size={14} />
        </span>
      </div>
      <div className="scenario-grid">
        {scenarios.map((scenario) => {
          const disabled =
            scenario.id !== "call" &&
            !island.enabled.includes(
              scenario.id as (typeof island.enabled)[number],
            );
          return (
            <button
              key={scenario.id}
              className={`scenario ${scenario.id} ${island.active === scenario.id ? "selected" : ""}`}
              disabled={disabled}
              onClick={() => {
                scenario.onClick();
                document.getElementById("preview")?.scrollIntoView({
                  block: "nearest",
                  behavior: reducedMotion ? "auto" : "smooth",
                });
              }}
            >
              <span className="scenario-top">
                <span className="scenario-icon">
                  <Icon name={scenario.icon} size={19} />
                </span>
                <Icon name="arrow" className="scenario-arrow" size={16} />
              </span>
              <strong>{scenario.title}</strong>
              <span>{disabled ? "Enable module below" : scenario.detail}</span>
              {island.active === scenario.id && (
                <i className="scenario-active" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
