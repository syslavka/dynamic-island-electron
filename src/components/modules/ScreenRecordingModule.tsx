import type { ScreenRecordingController } from "../../hooks/useScreenRecording";
import { useEffect } from 'react';

export function ScreenRecordingModule({ island }: { island: { screenRecording: ScreenRecordingController; touch?: () => void } }) {
  const capture = island.screenRecording;
  useEffect(() => { void capture.refreshSources(); }, [capture.refreshSources]);
  const seconds = Math.floor(capture.recordingTime);
  const time = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return (
    <div className="screen-recording-module module-enter">
      <div className="module-heading"><h3>Запись экрана</h3><span role="timer" aria-label="Recording duration">{time}</span></div>
      <p>{capture.recording ? "Идёт запись видео без звука." : "Выберите экран или окно. Видео сохранится в WebM."}</p>
      <label>Экран или окно
        <select aria-label="Capture source" value={capture.sourceId} disabled={capture.recording || capture.busy} onChange={event => { capture.setSourceId(event.target.value); island.touch?.(); }}>
          <option value="">Выберите источник</option>
          {capture.sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
        </select>
      </label>
      <div className="timer-buttons">
        <button className="module-action" disabled={capture.recording || capture.busy} onClick={() => { island.touch?.(); void capture.refreshSources(); }}>Найти окна</button>
        <button className="module-action primary" disabled={capture.busy || (!capture.recording && !capture.sourceId)} onClick={() => { island.touch?.(); void (capture.recording ? capture.stopRecording() : capture.startRecording()); }}>
          {capture.busy ? "Подождите…" : capture.recording ? "Остановить" : "Начать запись"}
        </button>
      </div>
      {capture.error && <p role="alert">{capture.error}</p>}
    </div>
  );
}
