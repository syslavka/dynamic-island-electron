import { useCallback, useEffect, useRef, useState } from "react";
import { COLLAPSE_DELAY, DESKTOP_MODULES, FOCUS_DURATION } from "../data/defaults";
import { useSettings } from "./useSettings";
import { useNotifications } from "./useNotifications";
import { useNativeMedia } from "./useNativeMedia";
import { mediaService } from "../services/mockServices";
import type { IslandState, ModuleId, MediaTrack } from "../types";
import { playbackTransition } from '../services/activityPolicy';
import type { LiveActivity } from '../services/activityPolicy';
import { useScreenRecording } from './useScreenRecording';
import { useFileTransfer } from './useFileTransfer';
import { useSystemActivity, applicationName } from './useSystemActivity';

export function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
}
export function useDynamicIsland() {
  const { settings } = useSettings();
  const native = useNativeMedia();
  const screenRecording = useScreenRecording();
  const fileTransfer = useFileTransfer();
  const systemActivity = useSystemActivity(settings.modules.some(module => module.id === 'system' && module.enabled));
  const [powerNotice, setPowerNotice] = useState<string | null>(null);
  const [soundNotice, setSoundNotice] = useState<string | null>(null);
  const lastMute = useRef<boolean | null>(null);
  const [active, setActive] = useState<ModuleId | "call">(
    settings.defaultModule,
  );
  const [expanded, setExpanded] = useState(false);
  const currentActivity = useRef({ active, expanded });
  currentActivity.current = { active, expanded };
  const selectionHistory = useRef<Partial<Record<ModuleId, { active: ModuleId | 'call'; expanded: boolean }>>>({});
  const hidden = false;
  const compactActivity = useRef<ModuleId | 'call'>('clock');
  const [interaction, setInteraction] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [progress, setProgress] = useState(47);
  const [volume, setVolume] = useState(65);
  const [muted, setMuted] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(FOCUS_DURATION);
  const [timerRemaining, setTimerRemaining] = useState(FOCUS_DURATION);
  const [timerMode, setTimerMode] = useState<"timer" | "stopwatch">("timer");
  const [stopwatch, setStopwatch] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [callStatus, setCallStatus] = useState<"ringing" | "active" | "ended">(
    "ended",
  );
  const [callTime, setCallTime] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [dnd, setDnd] = useState(false);
  const [flashlight, setFlashlight] = useState(false);
  const [charging, setCharging] = useState(true);
  const notificationState = useNotifications(settings.notificationBehavior);
  const { push } = notificationState;
  const track: MediaTrack = mediaService.tracks[trackIndex];
  const enabled = settings.modules
    .filter((module) => (module.id === 'clock' || module.enabled) && (!window.desktop || DESKTOP_MODULES.some(({ id }) => id === module.id)))
    .map((module) => module.id);
  const enabledKey = enabled.join(",");
  const previousDefault = useRef(settings.defaultModule);
  const lastTick = useRef(performance.now());

  const touch = useCallback(() => {
    setInteraction((value) => value + 1);
  }, []);
  const select = useCallback(
    (id: ModuleId | "call", open = true) => {
      if (id !== 'call' && id !== currentActivity.current.active) selectionHistory.current[id] = { ...currentActivity.current };
      setActive(id);
      setExpanded(open);
      touch();
    },
    [touch],
  );
  const toggleExpanded = useCallback(() => {
    if (!currentActivity.current.expanded) setActive(compactActivity.current);
    setExpanded((value) => !value);
    touch();
  }, [touch]);
  const collapse = useCallback(() => {
    setExpanded(false);
    touch();
  }, [touch]);
  const nextTrack = useCallback(
    (direction: -1 | 1) => {
      setTrackIndex(
        (index) =>
          (index + direction + mediaService.tracks.length) %
          mediaService.tracks.length,
      );
      setProgress(0);
      touch();
    },
    [touch],
  );
  const notify = useCallback(() => {
    push();
    select("notifications", !dnd);
  }, [push, select, dnd]);
  const startCall = useCallback(() => {
    setCallStatus("ringing");
    setCallTime(0);
    setCallMuted(false);
    select("call");
  }, [select]);
  const endCall = useCallback(() => {
    setCallStatus("ended");
    setExpanded(false);
    touch();
  }, [touch]);
  const acceptCall = useCallback(() => {
    setCallStatus("active");
    touch();
  }, [touch]);
  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerRemaining(timerDuration);
    setStopwatch(0);
    touch();
  }, [timerDuration, touch]);
  const setDuration = useCallback(
    (duration: number) => {
      setTimerDuration(duration);
      setTimerRemaining(duration);
      setTimerRunning(false);
      touch();
    },
    [touch],
  );
  const changeTimerMode = useCallback(
    (mode: "timer" | "stopwatch") => {
      setTimerMode(mode);
      setTimerRunning(false);
      touch();
    },
    [touch],
  );

  useEffect(() => {
    if (previousDefault.current !== settings.defaultModule) {
      previousDefault.current = settings.defaultModule;
      if (enabled.includes(settings.defaultModule))
        setActive(settings.defaultModule);
    }
    if (active !== "call" && !enabled.includes(active))
      setActive(
        enabled.includes(settings.defaultModule)
          ? settings.defaultModule
          : (enabled[0] ?? "media"),
      );
    // The serialized enabled IDs avoid an effect on every timer tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledKey, settings.defaultModule, active]);

  useEffect(() => {
    // A 250ms cadence keeps the scrubber smooth. Elapsed time, rather than a
    // fixed increment, also catches up correctly after a background-tab pause.
    lastTick.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastTick.current) / 1000;
      lastTick.current = now;
      if (playing && !window.desktop)
        setProgress((value) => Math.min(track.duration, value + elapsed));
      if (timerRunning) {
        if (timerMode === "timer")
          setTimerRemaining((value) => Math.max(0, value - elapsed));
        else setStopwatch((value) => value + elapsed);
      }
      if (recording) setRecordingTime((value) => value + elapsed);
      if (callStatus === "active") setCallTime((value) => value + elapsed);
    }, 250);
    return () => window.clearInterval(interval);
  }, [playing, track.duration, timerRunning, timerMode, recording, callStatus]);

  useEffect(() => {
    if (!window.desktop && progress >= track.duration && playing) nextTrack(1);
  }, [progress, track.duration, playing, nextTrack]);
  useEffect(() => {
    if (timerRunning && timerMode === "timer" && timerRemaining <= 0) {
      setTimerRunning(false);
      window.desktop?.timerFinished();
      if (enabled.includes("timer")) select("timer");
    }
  }, [timerRemaining, timerRunning, timerMode, select, enabledKey]);
  useEffect(() => {
    if (!settings.autoCollapse || !expanded || callStatus === "ringing") return;
    const timeout = window.setTimeout(() => setExpanded(false), COLLAPSE_DELAY);
    return () => window.clearTimeout(timeout);
  }, [settings.autoCollapse, expanded, interaction, callStatus]);
  useEffect(() => window.desktop?.onPowerActivity(value => {
    if (enabled.includes('battery')) { setPowerNotice(`${value.onBattery ? 'Низкий заряд' : 'Зарядка'} · ${value.battery ?? '—'}%`); touch(); }
  }), [enabledKey, touch]);
  useEffect(() => {
    if (!powerNotice) return;
    const timeout = window.setTimeout(() => setPowerNotice(null), 12000);
    return () => clearTimeout(timeout);
  }, [powerNotice]);
  useEffect(() => {
    const muted = systemActivity.snapshot?.audio?.renderMuted;
    if (typeof muted !== 'boolean') return;
    if (lastMute.current !== null && lastMute.current !== muted) { setSoundNotice(muted ? 'Звук выключен' : 'Звук включён'); touch(); }
    lastMute.current = muted;
  }, [systemActivity.snapshot?.audio?.renderMuted, touch]);
  useEffect(() => {
    if (!soundNotice) return;
    const timeout = window.setTimeout(() => setSoundNotice(null), 6000);
    return () => clearTimeout(timeout);
  }, [soundNotice]);
  const mediaWasPlaying = useRef(false);
  const mediaReturn = useRef<ModuleId | 'call' | null>(null);
  const mediaReturnExpanded = useRef(false);
  useEffect(() => {
    const playingNow = !!native.media.playing;
    if (!settings.autoMedia) { mediaWasPlaying.current = false; mediaReturn.current = null; return; }
    const apply = () => {
      const current = currentActivity.current;
      const started = playingNow && !mediaWasPlaying.current;
      const result = playbackTransition(current.active, playingNow, mediaWasPlaying.current, mediaReturn.current, enabled, enabled.includes(settings.defaultModule) ? settings.defaultModule : enabled[0] ?? 'clock');
      if (playingNow && !mediaWasPlaying.current) mediaReturnExpanded.current = current.expanded;
      if (started && current.active === 'media') {
        const previous = selectionHistory.current.media;
        if (previous && previous.active !== 'call' && enabled.includes(previous.active)) {
          result.returnTo = previous.active;
          mediaReturnExpanded.current = previous.expanded;
        }
      }
      mediaWasPlaying.current = playingNow;
      mediaReturn.current = result.returnTo;
      if (result.changed || (started && enabled.includes('media'))) {
        setActive(result.active);
        setExpanded(playingNow ? true : mediaReturnExpanded.current);
        touch();
      }
    };
    // Brief gaps during a track/session change should not bounce the island back.
    if (!playingNow && mediaWasPlaying.current) {
      const timeout = window.setTimeout(apply, 1000);
      return () => clearTimeout(timeout);
    }
    apply();
  }, [native.media.playing, enabledKey, settings.defaultModule, settings.autoMedia, touch]);
  // Owned operations keep their controls available while running, then restore
  // the preceding view. A manual navigation made meanwhile always takes precedence.
  const recordingWasActive = useRef(false);
  useEffect(() => {
    const stopped = recordingWasActive.current && !screenRecording.recording;
    recordingWasActive.current = screenRecording.recording;
    if (!stopped) return;
    const timeout = window.setTimeout(() => {
      if (currentActivity.current.active !== 'recording') return;
      const previous = selectionHistory.current.recording;
      const target = previous?.active !== 'call' && previous && enabled.includes(previous.active) ? previous.active : settings.defaultModule;
      setActive(target); setExpanded(previous?.expanded ?? false); touch();
    }, 1800);
    return () => clearTimeout(timeout);
  }, [screenRecording.recording, enabledKey, settings.defaultModule, touch]);
  useEffect(() => {
    if (timerMode !== 'timer' || timerRemaining > 0 || timerRunning) return;
    const timeout = window.setTimeout(() => {
      if (currentActivity.current.active !== 'timer') return;
      const previous = selectionHistory.current.timer;
      const target = native.media.playing && enabled.includes('media') ? 'media' : previous?.active !== 'call' && previous && enabled.includes(previous.active) ? previous.active : settings.defaultModule;
      setActive(target); setExpanded(previous?.expanded ?? false); touch();
    }, 5000);
    return () => clearTimeout(timeout);
  }, [timerMode, timerRemaining <= 0, timerRunning, enabledKey, native.media.playing, settings.defaultModule, touch]);
  const liveActivities: LiveActivity[] = [];
  const system = systemActivity.snapshot;
  if (system?.camera?.active) liveActivities.push({ id: 'camera', module: 'system', icon: 'camera', title: 'Камера используется', detail: system.camera.apps.map(applicationName).join(', ') || 'По данным Windows', priority: 100, tone: 'green' });
  if (system?.microphone?.active) liveActivities.push({ id: 'microphone', module: 'system', icon: 'mic', title: 'Микрофон используется', detail: system.microphone.apps.map(applicationName).join(', ') || 'По данным Windows', priority: 95, tone: 'amber' });
  if (screenRecording.recording) liveActivities.push({ id: 'screen', module: 'recording', icon: 'record', title: 'Запись экрана', detail: formatTime(screenRecording.recordingTime), priority: 90, tone: 'red' });
  if (enabled.includes('timer') && (timerRunning || timerRemaining !== timerDuration || stopwatch > 0)) liveActivities.push({ id: 'timer', module: 'timer', icon: 'timer', title: timerMode === 'timer' ? 'Таймер' : 'Секундомер', detail: formatTime(timerMode === 'timer' ? timerRemaining : stopwatch), priority: timerMode === 'timer' && timerRemaining < 60 ? 85 : 75, tone: 'amber' });
  if (powerNotice) liveActivities.push({ id: 'power', module: 'battery', icon: 'bolt', title: 'Питание', detail: powerNotice, priority: 80, tone: 'green' });
  if (fileTransfer.transfer?.status === 'copying') liveActivities.push({ id: 'transfer', module: 'transfers', icon: 'transfer', title: 'Копирование файла', detail: `${fileTransfer.transfer.name} · ${fileTransfer.transfer.total ? Math.round(fileTransfer.transfer.transferred / fileTransfer.transfer.total * 100) : 0}%`, priority: 70 });
  if (native.media.playing && enabled.includes('media')) liveActivities.push({ id: 'media', module: 'media', icon: 'music', title: 'Музыка', detail: native.track.title, priority: 60 });
  if (soundNotice || system?.audio?.renderMuted) liveActivities.push({ id: 'mute', module: 'system', icon: system?.audio?.renderMuted ? 'mute' : 'volume', title: 'Звук Windows', detail: soundNotice || 'Звук выключен', priority: soundNotice ? 65 : 35 });
  if (system?.bluetooth?.devices.length) liveActivities.push({ id: 'bluetooth', module: 'system', icon: 'bluetooth', title: 'Bluetooth', detail: system.bluetooth.devices.map(device => `${device.name}${device.batteryAvailable ? ` · ${device.batteryPercent}%` : ''}`).join(', '), priority: 30 });
  // Paired devices and an already-muted output are status, not foreground work.
  const foreground = liveActivities.filter(item => item.id !== 'bluetooth' && (item.id !== 'mute' || !!soundNotice));
  const compact = foreground.find(item => item.module === active)?.module ?? [...foreground].sort((a, b) => b.priority - a.priority)[0]?.module ?? 'clock';
  compactActivity.current = compact;
  const displayActive = expanded ? active : compact;
  const idle = false;
  const state: IslandState =
    idle || hidden
      ? "idle"
      : !expanded
        ? "compact"
        : active === "call"
          ? "call"
          : active === "media"
            ? "media"
            : active === "notifications"
              ? "notification"
              : active === "timer"
                ? "timer"
                : "expanded";

  return {
    active: displayActive,
    clockOnly: !expanded && displayActive === 'clock',
    select,
    expanded: expanded && !idle && !hidden,
    toggleExpanded,
    collapse,
    state,
    hidden,
    touch,
    interaction,
    liveActivities: foreground,
    primaryActivity: foreground.filter(activity => activity.module === displayActive).sort((a, b) => b.priority - a.priority)[0],
    screenRecording,
    fileTransfer,
    systemActivity,
    enabled,
    track,
    trackIndex,
    playing,
    setPlaying,
    progress,
    setProgress,
    nextTrack,
    volume,
    setVolume,
    muted,
    setMuted,
    timerRunning,
    setTimerRunning,
    timerDuration,
    timerRemaining,
    timerMode,
    changeTimerMode,
    stopwatch,
    resetTimer,
    setDuration,
    recording: window.desktop ? screenRecording.recording : recording,
    setRecording,
    recordingTime,
    setRecordingTime,
    callStatus,
    callTime,
    callMuted,
    setCallMuted,
    startCall,
    acceptCall,
    endCall,
    dnd,
    setDnd,
    flashlight,
    setFlashlight,
    charging,
    setCharging,
    ...notificationState,
    notify,
    nativeMedia: native.media,
    mediaBusy: native.busy,
    ...(window.desktop ? { track: native.track, playing: !!native.media.playing, progress: native.media.position || 0, setPlaying: (value: boolean) => { touch(); void native.command(value ? "play" : "pause"); }, setProgress: (value: number) => { touch(); void native.command("seek", value); }, nextTrack: (direction: -1 | 1) => { touch(); void native.command(direction === 1 ? "next" : "previous"); } } : {}),
  };
}
export type IslandController = ReturnType<typeof useDynamicIsland>;
