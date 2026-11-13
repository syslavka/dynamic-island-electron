import { useEffect, useRef, useState } from 'react';
import type { IslandController } from '../../hooks/useDynamicIsland';
import { formatTime } from '../../hooks/useDynamicIsland';
import { secondaryActivity } from '../../services/activityPolicy';
import { useHold } from '../../hooks/useHold';
import { Icon } from '../Icon';

export function SecondaryIsland({ island, open, setOpen }: { island: IslandController; open: boolean; setOpen: (value: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const candidates = island.liveActivities.filter(activity => activity.module !== island.active);
  const priority = secondaryActivity(island.liveActivities, island.active);
  const activity = (open && candidates.find(item => item.id === selected)) || priority;
  const activityId = activity?.id;
  const [exiting, setExiting] = useState(false);
  const lastActivity = useRef(activity);
  if (activity) lastActivity.current = activity;
  const visual = activity ?? lastActivity.current;
  const show = () => { island.touch(); island.collapse(); setSelected(activityId ?? null); setOpen(!open); };
  const gesture = useHold(() => { if (!open) show(); }, show);
  useEffect(() => {
    if (!activityId) {
      if (trigger.current?.parentElement?.contains(document.activeElement)) document.querySelector<HTMLButtonElement>('.island-trigger')?.focus();
      setOpen(false);
      if (lastActivity.current) {
        setExiting(true);
        const timeout = window.setTimeout(() => { setExiting(false); lastActivity.current = null; }, 950);
        return () => clearTimeout(timeout);
      }
    } else setExiting(false);
  }, [activityId, setOpen]);
  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => setOpen(false), 8000);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { clearTimeout(timeout); document.removeEventListener('keydown', key); };
  }, [open, island.interaction, setOpen]);
  const recording = activity?.id === 'screen';
  const timer = activity?.id === 'timer';
  const media = activity?.id === 'media';
  const transfer = activity?.id === 'transfer';
  return <div className={`secondary-island ${activity ? 'present' : 'absent'} ${open && activity ? 'secondary-expanded' : ''}`} data-hit-region={activity || exiting ? 'true' : undefined} data-activity={activityId} data-tone={visual?.tone} onPointerDownCapture={island.touch} onKeyDownCapture={island.touch} aria-hidden={!activity} inert={!activity}>
    <div className="glass-reflections" aria-hidden="true" />
    <button ref={trigger} className="secondary-trigger" aria-label={activity ? `${activity.title}: ${activity.detail}` : 'Нет фоновых активностей'} aria-expanded={open} aria-controls="secondary-content" {...gesture}>
      <Icon name={visual?.icon ?? 'layers'} size={19} />
      <span>{activity?.title}</span>
      <Icon name={open ? 'down' : 'up'} size={14} />
    </button>
    <div id="secondary-content" className="secondary-content" inert={!open} aria-hidden={!open}>
      <strong className={timer || recording ? 'secondary-time' : ''}>{timer ? formatTime(island.timerMode === 'timer' ? island.timerRemaining : island.stopwatch) : recording ? formatTime(island.screenRecording.recordingTime) : activity?.detail}</strong>
      {timer && <div className="secondary-controls"><button aria-label={island.timerRunning ? 'Pause timer' : 'Resume timer'} onClick={() => island.setTimerRunning(!island.timerRunning)}><Icon name={island.timerRunning ? 'pause' : 'play'} /></button><button aria-label="Reset timer" onClick={island.resetTimer}><Icon name="reset" /></button></div>}
      {recording && <button className="module-action recording-stop" onClick={() => void island.screenRecording.stopRecording()}><Icon name="stop" size={15} />Остановить запись</button>}
      {media && <div className="secondary-controls"><button aria-label="Previous track" disabled={!island.nativeMedia.canPrevious || island.mediaBusy} onClick={() => island.nextTrack(-1)}><Icon name="previous" /></button><button aria-label={island.playing ? 'Pause playback' : 'Play music'} disabled={island.mediaBusy || !(island.playing ? island.nativeMedia.canPause : island.nativeMedia.canPlay)} onClick={() => island.setPlaying(!island.playing)}><Icon name={island.playing ? 'pause' : 'play'} /></button><button aria-label="Next track" disabled={!island.nativeMedia.canNext || island.mediaBusy} onClick={() => island.nextTrack(1)}><Icon name="next" /></button></div>}
      {transfer && <button className="module-action" onClick={() => void island.fileTransfer.cancelTransfer()}>Отменить копирование</button>}
      {activity?.id === 'microphone' && <button className="module-action" onClick={() => void window.desktop?.openSystemPage('microphone')}>Доступ к микрофону<Icon name="external" size={14} /></button>}
      {activity?.id === 'camera' && <button className="module-action" onClick={() => void window.desktop?.openSystemPage('camera')}>Доступ к камере<Icon name="external" size={14} /></button>}
      {activity?.id === 'bluetooth' && <button className="module-action" onClick={() => void window.desktop?.openSystemPage('bluetooth')}>Устройства<Icon name="external" size={14} /></button>}
      {activity?.id === 'mute' && <button className="module-action" disabled={island.systemActivity.busy || island.systemActivity.snapshot?.audio?.renderMuted == null} onClick={() => void island.systemActivity.setMute(!island.systemActivity.snapshot?.audio?.renderMuted)}>{island.systemActivity.snapshot?.audio?.renderMuted ? 'Включить звук' : 'Выключить звук'}</button>}
      {candidates.length > 1 && <div className="activity-dots" aria-label="Фоновые активности">{candidates.map(item => <button key={item.id} className={item.id === activityId ? 'active' : ''} aria-label={item.title} aria-pressed={item.id === activityId} onClick={() => setSelected(item.id)} />)}</div>}
    </div>
  </div>;
}
