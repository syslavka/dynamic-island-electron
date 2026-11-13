export type Theme = "glass" | "dark" | "light" | "auto";
export type ModuleId =
  | "clock"
  | "media"
  | "sound"
  | "notifications"
  | "timer"
  | "battery"
  | "weather"
  | "calendar"
  | "recording"
  | "actions"
  | "system"
  | "transfers";
export type IslandState =
  | "idle"
  | "compact"
  | "expanded"
  | "notification"
  | "media"
  | "call"
  | "timer";
export type NotificationBehavior = "queue" | "replace" | "stack";
export interface ModuleConfig {
  id: ModuleId;
  enabled: boolean;
}
export interface Settings {
  version: 1;
  theme: Theme;
  accent: string;
  blur: number;
  opacity: number;
  glass: number;
  speed: number;
  scale: number;
  topOffset: number;
  autoCollapse: boolean;
  autoMedia: boolean;
  autoHide: boolean;
  reducedMotion: boolean;
  notificationBehavior: NotificationBehavior;
  defaultModule: ModuleId;
  modules: ModuleConfig[];
}
export interface IslandNotification {
  id: string;
  title: string;
  body: string;
  source: string;
  createdAt: number;
}
export interface MediaTrack {
  artwork?: string;
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  color: string;
}
export interface ModuleDefinition {
  id: ModuleId;
  title: string;
  description: string;
  icon: string;
}
