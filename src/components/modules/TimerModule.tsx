import { Icon } from "../Icon";
import { formatTime } from "../../hooks/useDynamicIsland";
import type { IslandController } from "../../hooks/useDynamicIsland";

export function TimerModule({ island }: { island: IslandController }) {
  const stopwatch = island.timerMode === "stopwatch";
  const complete = !stopwatch && island.timerRemaining <= 0;
  const fraction = stopwatch ? 1 : island.timerRemaining / island.timerDuration;
  return (
    <div className="timer-module module-enter">
      <div className="mini-segment">
        <button
          className={!stopwatch ? "selected" : ""}
          aria-pressed={!stopwatch}
          onClick={() => island.changeTimerMode("timer")}
        >
          Timer
        </button>
        <button
          className={stopwatch ? "selected" : ""}
          aria-pressed={stopwatch}
          onClick={() => island.changeTimerMode("stopwatch")}
        >
          Stopwatch
        </button>
      </div>
      <div className="timer-main">
        <div>
          <p>
            {stopwatch
              ? "EVERY SECOND COUNTS"
              : complete
                ? "NICELY DONE"
                : "A LITTLE SPACE TO FOCUS"}
          </p>
          <h3>
            {formatTime(stopwatch ? island.stopwatch : island.timerRemaining)}
          </h3>
          <span>
            {complete
              ? "Time for a well-earned break."
              : island.timerRunning
                ? "One thing at a time."
                : "Ready when you are."}
          </span>
        </div>
        <svg
          className="timer-ring"
          viewBox="0 0 60 60"
          aria-label={`${Math.round(fraction * 100)} percent remaining`}
        >
          <circle cx="30" cy="30" r="25" />
          <circle
            cx="30"
            cy="30"
            r="25"
            strokeDasharray={Math.PI * 50}
            strokeDashoffset={Math.PI * 50 * (1 - fraction)}
          />
          <path d="M30 17v13l8 5" />
        </svg>
      </div>
      <div className="timer-actions">
        {!stopwatch && (
          <div className="timer-presets">
            {[1, 5, 25].map((minutes) => (
              <button
                key={minutes}
                className={
                  island.timerDuration === minutes * 60 ? "selected" : ""
                }
                onClick={() => island.setDuration(minutes * 60)}
              >
                {minutes}m
              </button>
            ))}
          </div>
        )}
        <div className="timer-buttons">
          <button
            className="icon-button"
            aria-label="Reset timer"
            onClick={island.resetTimer}
          >
            <Icon name="reset" size={18} />
          </button>
          <button
            className="module-action primary"
            onClick={() => {
              if (complete) island.setDuration(island.timerDuration);
              island.setTimerRunning(!island.timerRunning);
            }}
          >
            <Icon name={island.timerRunning ? "pause" : "play"} size={14} />
            {island.timerRunning ? "Pause" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}
