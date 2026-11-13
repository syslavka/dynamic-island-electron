import { useState } from "react";
import { calendarService } from "../../services/mockServices";
import { Icon } from "../Icon";
import { Toggle } from "../Controls";
import type { IslandController } from "../../hooks/useDynamicIsland";
import { formatTime } from "../../hooks/useDynamicIsland";

export function CalendarModule() {
  const event = calendarService.getNext();
  const [remind, setRemind] = useState(false);
  return (
    <div className="calendar-module module-enter">
      <p className="eyebrow">UP NEXT · SAMPLE EVENT</p>
      <div className="calendar-event">
        <div className="calendar-date">
          <span>THU</span>
          <strong>12</strong>
        </div>
        <div>
          <h3>{event.title}</h3>
          <p>{event.time}</p>
          <span>{event.attendees}</span>
        </div>
      </div>
      <p className="event-location">
        <Icon name="monitor" size={15} />
        {event.location}
      </p>
      <button
        className="module-action"
        aria-pressed={remind}
        onClick={() => setRemind(!remind)}
      >
        <Icon name={remind ? "check" : "bell"} size={14} />
        {remind ? "Reminder set for this session" : "Remind me in this session"}
      </button>
    </div>
  );
}
export function RecordingModule({ island }: { island: IslandController }) {
  return (
    <div className="simple-module module-enter">
      <div className={`recording-dot ${island.recording ? "active" : ""}`}>
        <Icon name="mic" size={26} />
      </div>
      <h3 className="mono">{formatTime(island.recordingTime)}</h3>
      <p>
        {island.recording
          ? "Recording simulation in progress"
          : "Capture a little inspiration."}
      </p>
      <button
        className="module-action primary"
        onClick={() => {
          island.setRecording(!island.recording);
          if (!island.recording) island.setRecordingTime(0);
        }}
      >
        <Icon name={island.recording ? "pause" : "mic"} size={14} />
        {island.recording ? "Stop recording" : "Simulate recording"}
      </button>
      <small className="module-disclaimer">
        Demo only. Your microphone is never accessed.
      </small>
    </div>
  );
}
export function ActionsModule({ island }: { island: IslandController }) {
  return (
    <div className="actions-module module-enter">
      <p className="eyebrow">LESS FRICTION. MORE FLOW.</p>
      <div className="quick-action-row">
        <div>
          <Icon name="moon" />
          <span>
            Do not disturb<small>Keep notifications compact</small>
          </span>
        </div>
        <Toggle
          label="Do not disturb"
          checked={island.dnd}
          onChange={() => island.setDnd(!island.dnd)}
        />
      </div>
      <div className="quick-action-row">
        <div>
          <Icon name="bolt" />
          <span>
            Flashlight<small>Preview a little extra light</small>
          </span>
        </div>
        <Toggle
          label="Flashlight"
          checked={island.flashlight}
          onChange={() => island.setFlashlight(!island.flashlight)}
        />
      </div>
      <small className="module-disclaimer">
        Mock controls · No device settings are changed
      </small>
    </div>
  );
}
export function CallModule({ island }: { island: IslandController }) {
  const ringing = island.callStatus === "ringing";
  const ended = island.callStatus === "ended";
  return (
    <div className="call-module module-enter">
      <div className={`caller-avatar ${ringing ? "ringing" : ""}`}>JL</div>
      <h3>Jamie Lee</h3>
      <p>
        {ringing
          ? "Incoming call · Mobile"
          : ended
            ? "Call ended"
            : `Connected · ${formatTime(island.callTime)}`}
      </p>
      <div className="call-controls">
        {ended ? (
          <button className="module-action" onClick={island.startCall}>
            <Icon name="phone" size={16} /> Call again
          </button>
        ) : (
          <>
            <button
              className="call-button decline"
              aria-label={ringing ? "Decline call" : "End call"}
              onClick={island.endCall}
            >
              <Icon name="phone" size={22} />
            </button>
            {ringing ? (
              <button
                className="call-button accept"
                aria-label="Accept call"
                onClick={island.acceptCall}
              >
                <Icon name="phone" size={22} />
              </button>
            ) : (
              <button
                className={`call-button ${island.callMuted ? "is-muted" : ""}`}
                aria-label={island.callMuted ? "Unmute call" : "Mute call"}
                aria-pressed={island.callMuted}
                onClick={() => island.setCallMuted(!island.callMuted)}
              >
                <Icon name={island.callMuted ? "mute" : "mic"} size={22} />
              </button>
            )}
          </>
        )}
      </div>
      <small className="module-disclaimer">
        Simulated call · No network or microphone access
      </small>
    </div>
  );
}
