import { memo } from "react";
import { MODULES } from "../data/defaults";
import { useSettings } from "../hooks/useSettings";
import { Toggle } from "./Controls";
import { Icon } from "./Icon";
import type { ModuleId } from "../types";

export const ModulesPanel = memo(function ModulesPanel({
  onSelect,
}: {
  onSelect: (id: ModuleId) => void;
}) {
  const { settings, toggleModule, moveModule } = useSettings();
  return (
    <section
      className="modules-section"
      id="modules"
      aria-labelledby="modules-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="modules-title">A place for the everyday.</h2>
          <p>Choose what belongs on your island.</p>
        </div>
        <span className="count-tag">
          {settings.modules.filter((module) => module.enabled).length} of{" "}
          {MODULES.length} enabled
        </span>
      </div>
      <div className="modules-panel panel">
        {settings.modules.map((module, index) => {
          const definition = MODULES.find((item) => item.id === module.id)!;
          return (
            <div
              className={`module-row ${module.enabled ? "" : "disabled"}`}
              key={module.id}
            >
              <span className="module-grip" aria-hidden="true">
                ⠿
              </span>
              <button
                className="module-open"
                disabled={!module.enabled}
                onClick={() => onSelect(module.id)}
                aria-label={`Preview ${definition.title}`}
              >
                <span className={`module-icon ${module.id}`}>
                  <Icon name={definition.icon} size={18} />
                </span>
                <span>
                  <strong>{definition.title}</strong>
                  <small>{definition.description}</small>
                </span>
              </button>
              <div className="reorder-buttons">
                <button
                  className="icon-button"
                  aria-label={`Move ${definition.title} up`}
                  disabled={index === 0}
                  onClick={() => moveModule(module.id, -1)}
                >
                  <Icon name="up" size={13} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Move ${definition.title} down`}
                  disabled={index === settings.modules.length - 1}
                  onClick={() => moveModule(module.id, 1)}
                >
                  <Icon name="down" size={13} />
                </button>
              </div>
              <Toggle
                label={`Enable ${definition.title}`}
                checked={module.enabled}
                onChange={() => toggleModule(module.id)}
              />
            </div>
          );
        })}
      </div>
      <div className="module-footnote">
        <Icon name="info" size={13} />
        <span>
          Use the arrows to arrange modules. Your island follows your order.
        </span>
      </div>
    </section>
  );
});
