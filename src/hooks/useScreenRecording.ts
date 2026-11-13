import { useCallback, useEffect, useRef, useState } from "react";

export interface RecordingSource { id: string; name: string }
export interface RecordingDesktop {
  recordingSources(): Promise<RecordingSource[]>;
  recordingPrepare(sourceId: string): Promise<{ token: string } | null>;
  recordingDestination(token: string): Promise<boolean>;
  recordingChunk(token: string, data: ArrayBuffer): Promise<void>;
  recordingFinish(token: string): Promise<void>;
  recordingCancel(token: string): Promise<void>;
}
type Run = {
  api: RecordingDesktop; token?: string; stream?: MediaStream; recorder?: MediaRecorder;
  queue: Promise<void>; pending: number; written: number; started: number; stopping: boolean;
  failed: boolean; stoppedAt?: number; done: Promise<void>; resolve: () => void;
};
const bridge = () => window.desktop as (typeof window.desktop & Partial<RecordingDesktop>);
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

export function useScreenRecording() {
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sources, setSources] = useState<RecordingSource[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const current = useRef<Run | null>(null);
  const refreshing = useRef(false);
  const report = useCallback((value: unknown) => { if (mounted.current) setError(message(value)); }, []);
  const refreshSources = useCallback(async () => {
    if (refreshing.current || current.current) return;
    refreshing.current = true;
    if (mounted.current) { setBusy(true); setError(null); }
    try {
      const api = bridge();
      if (!api?.recordingSources) throw new Error("Screen recording requires the desktop app.");
      const list = await api.recordingSources();
      if (mounted.current) { setSources(list); setSourceId(previous => list.some(item => item.id === previous) ? previous : list[0]?.id ?? ""); }
    } catch (err) { report(err); }
    finally { refreshing.current = false; if (mounted.current && !current.current) setBusy(false); }
  }, [report]);
  const stopRecording = useCallback(async () => {
    const run = current.current;
    if (!run) return;
    run.stoppedAt ??= performance.now();
    run.stopping = true;
    if (mounted.current) setBusy(true);
    if (run.recorder) {
      if (run.recorder.state !== "inactive") run.recorder.stop();
      // Let MediaRecorder flush its final encoded data before ending capture.
    } else run.stream?.getTracks().forEach(track => track.stop());
    await run.done;
  }, []);
  const startRecording = useCallback(async () => {
    if (current.current || refreshing.current || !mounted.current) return;
    setError(null);
    setBusy(true);
    let resolve!: () => void;
    const run: Run = { api: bridge() as RecordingDesktop, queue: Promise.resolve(), pending: 0, written: 0, started: 0, stopping: false, failed: false, done: new Promise<void>(done => { resolve = done; }), resolve: () => resolve() };
    current.current = run;
    let finishing = false;
    const finish = async () => {
      if (finishing) return;
      finishing = true;
      run.stream?.getTracks().forEach(track => track.stop());
      if (mounted.current) { setRecording(false); setBusy(true); if (run.started) setRecordingTime(((run.stoppedAt ?? performance.now()) - run.started) / 1000); }
      try {
        await run.queue;
        if (run.started && !run.failed && !run.written) throw new Error("No video data was received. Keep the captured window visible and try recording again.");
        if (run.token) {
          if (run.failed) await run.api.recordingCancel(run.token);
          else await run.api.recordingFinish(run.token);
        }
      } catch (err) {
        report(err);
        if (run.token) await run.api.recordingCancel(run.token).catch(() => {});
      } finally {
        if (current.current === run) current.current = null;
        if (mounted.current) setBusy(false);
        run.resolve();
      }
    };
    const fail = (err: unknown) => {
      if (!run.failed) report(err);
      run.stoppedAt ??= performance.now();
      run.failed = true;
      run.stopping = true;
      if (run.recorder && run.recorder.state !== "inactive") run.recorder.stop();
      else void finish();
    };
    try {
      if (!run.api?.recordingPrepare || !run.api.recordingDestination || !run.api.recordingChunk || !run.api.recordingFinish || !run.api.recordingCancel) throw new Error("Screen recording requires the desktop app.");
      if (!sourceId) throw new Error("Choose a screen or window first.");
      const prepared = await run.api.recordingPrepare(sourceId);
      if (!prepared) { await finish(); return; }
      run.token = prepared.token;
      if (run.stopping || !mounted.current) { run.failed = true; await finish(); return; }
      run.stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (run.stopping || !mounted.current) { run.failed = true; await finish(); return; }
      const destinationChosen = await run.api.recordingDestination(run.token);
      if (!destinationChosen || run.stopping || !mounted.current) { await finish(); return; }
      if (!run.stream.getVideoTracks().some(track => track.readyState === "live")) throw new Error("Screen sharing ended before recording started.");
      const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("WebM recording is unavailable.");
      const recorder = new MediaRecorder(run.stream, { mimeType });
      run.recorder = recorder;
      recorder.ondataavailable = ({ data }) => {
        if (!data.size || run.failed) return;
        if (run.pending + data.size > 64 * 1024 * 1024) { fail(new Error("Recording stopped: disk cannot keep up.")); return; }
        run.pending += data.size;
        run.queue = run.queue.then(async () => {
          if (run.failed) return;
          for (let offset = 0; offset < data.size; offset += 16 * 1024 * 1024) {
            const bytes = await data.slice(offset, offset + 16 * 1024 * 1024).arrayBuffer();
            await run.api.recordingChunk(run.token!, bytes);
            run.written += bytes.byteLength;
          }
        }).catch(err => { fail(err); }).finally(() => { run.pending -= data.size; });
      };
      recorder.onerror = () => fail(new Error("The screen recorder failed."));
      recorder.onstop = () => { void finish(); };
      run.stream.getVideoTracks().forEach(track => track.addEventListener("ended", () => { void stopRecording(); }, { once: true }));
      recorder.start(1000);
      run.started = performance.now();
      setRecordingTime(0);
      setRecording(true);
      setBusy(false);
    } catch (err) { run.failed = true; report(err); await finish(); }
  }, [sourceId, report, stopRecording]);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = window.desktop?.onPrepareQuit(() => stopRecording());
    const timer = window.setInterval(() => {
      const run = current.current;
      if (run?.started && !run.stopping) setRecordingTime((performance.now() - run.started) / 1000);
    }, 250);
    return () => { unsubscribe?.(); mounted.current = false; window.clearInterval(timer); void stopRecording(); };
  }, [stopRecording]);
  return { recording, recordingTime, sources, refreshSources, sourceId, setSourceId, startRecording, stopRecording, error, busy };
}
export type ScreenRecordingController = ReturnType<typeof useScreenRecording>;
