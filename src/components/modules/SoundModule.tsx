import { Icon } from "../Icon";
import type { IslandController } from "../../hooks/useDynamicIsland";

export function SoundModule({ island }: { island: IslandController }) {
  return (
    <div className="simple-module module-enter">
      <div className="module-hero-icon">
        <Icon name={island.muted ? "mute" : "volume"} size={34} />
      </div>
      <h3>{island.muted ? "A little quiet." : "Your perfect volume."}</h3>
      <p>Simulated system sound</p>
      <div className="volume-row">
        <button
          className="icon-button"
          aria-label={island.muted ? "Unmute sound" : "Mute sound"}
          aria-pressed={island.muted}
          onClick={() => island.setMuted(!island.muted)}
        >
          <Icon name={island.muted ? "mute" : "volume"} />
        </button>
        <input
          aria-label="Volume"
          type="range"
          min="0"
          max="100"
          value={island.muted ? 0 : island.volume}
          onChange={(event) => {
            island.setVolume(Number(event.target.value));
            island.setMuted(false);
          }}
        />
        <output>{island.muted ? 0 : island.volume}%</output>
      </div>
    </div>
  );
}
