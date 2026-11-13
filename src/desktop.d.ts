export interface NativeMedia { available: boolean; error?: string; ok?: boolean; title?: string; artist?: string; album?: string; source?: string; artwork?: string; playing?: boolean; duration?: number; position?: number; canPlay?: boolean; canPause?: boolean; canNext?: boolean; canPrevious?: boolean; canSeek?: boolean; }
export interface SystemInfo {
  battery: number | null;
  onBattery: boolean;
  autostart: boolean;
  packaged: boolean;
  nativeGlass?: boolean;
}
export interface Capability { available: boolean; reason?: string | null; source?: string; }
export interface ActivitySnapshot {
  schemaVersion: 1;
  available: boolean;
  sampledAt: string;
  capabilities: Record<'microphone' | 'camera' | 'bluetooth' | 'audio' | 'foreground', Capability>;
  microphone: { active: boolean; apps: string[] } | null;
  camera: { active: boolean; apps: string[] } | null;
  bluetooth: { sampledAt: string; complete: boolean; devices: { id: string; name: string; connected: boolean; batteryAvailable: boolean; batteryPercent: number | null; transport: string }[] } | null;
  audio: { renderMuted: boolean | null; captureMuted: boolean | null; endpoints: { render: Capability; capture: Capability } } | null;
  foreground: { pid: number; name: string | null; path: string | null; title: string; windowHandle: string } | null;
}
declare global {
  interface Window {
    desktop?: {
      getActivities: () => Promise<ActivitySnapshot>;
      setSystemMute: (muted: boolean, endpoint?: 'render' | 'capture') => Promise<{ ok: boolean; error?: string }>;
      openSystemPage: (page: 'microphone' | 'camera' | 'bluetooth' | 'sound') => Promise<boolean>;
      recordingSources: () => Promise<{ id: string; name: string }[]>;
      recordingPrepare: (sourceId: string) => Promise<{ token: string } | null>;
      recordingDestination: (token: string) => Promise<boolean>;
      recordingChunk: (token: string, data: ArrayBuffer) => Promise<void>;
      recordingFinish: (token: string) => Promise<void>;
      recordingCancel: (token: string) => Promise<void>;
      startTransfer: () => Promise<import('./hooks/useFileTransfer').Transfer | null>;
      cancelTransfer: (id: string) => Promise<import('./hooks/useFileTransfer').Transfer | null>;
      getTransferStatus: () => Promise<import('./hooks/useFileTransfer').Transfer | null>;
      onTransfer: (listener: (value: import('./hooks/useFileTransfer').Transfer) => void) => () => void;
      onPrepareQuit: (listener: () => Promise<void>) => () => void;
      openSettings: () => void;
      quit: () => void;
      setRegions: (regions: { x: number; y: number; width: number; height: number; radius: number }[]) => void;
      publishSettings: (value: string) => void;
      onSettings: (listener: (value: string) => void) => () => void;
      media: (command?: "status" | "play" | "pause" | "next" | "previous" | "seek", position?: number) => Promise<NativeMedia>;
      onPowerActivity: (listener: (value: SystemInfo) => void) => () => void;
      getSystem: () => Promise<SystemInfo | null>;
      setAutostart: (enabled: boolean) => Promise<boolean>;
      timerFinished: () => void;
    };
  }
}
