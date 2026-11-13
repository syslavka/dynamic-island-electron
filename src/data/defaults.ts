import type { ModuleDefinition, Settings } from "../types";

export const MODULES: ModuleDefinition[] = [
  { id: "system", title: "Система", description: "Устройства, микрофон, камера и звук", icon: "layers" },
  { id: "transfers", title: "Файлы", description: "Копирование с прогрессом и отменой", icon: "transfer" },
  { id: "clock", title: "Часы", description: "Время и дата вашего компьютера", icon: "timer" },
  {
    id: "media",
    title: "Music & media",
    description: "A soundtrack for your day",
    icon: "music",
  },
  {
    id: "sound",
    title: "Sound",
    description: "Find your perfect volume",
    icon: "volume",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "The things that need you",
    icon: "bell",
  },
  {
    id: "timer",
    title: "Focus timer",
    description: "Make room for deep work",
    icon: "timer",
  },
  {
    id: "battery",
    title: "Battery",
    description: "A little energy check-in",
    icon: "battery",
  },
  {
    id: "weather",
    title: "Weather",
    description: "A glimpse of the outside",
    icon: "sun",
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Your next moment, at a glance",
    icon: "calendar",
  },
  {
    id: "recording",
    title: "Recording",
    description: "Capture an idea in the moment",
    icon: "record",
  },
  {
    id: "actions",
    title: "Quick actions",
    description: "Small shortcuts, fewer distractions",
    icon: "bolt",
  },
];
export const DESKTOP_MODULES: ModuleDefinition[] = [
  { id: "system", title: "Системные события", description: "Микрофон, камера, Bluetooth и звук", icon: "layers" },
  { id: "recording", title: "Запись экрана", description: "Запись выбранного экрана или окна в WebM", icon: "record" },
  { id: "transfers", title: "Передача файлов", description: "Копирование файла с прогрессом и отменой", icon: "transfer" },
  { id: "media", title: "Music", description: "Windows playback, artwork and controls", icon: "music" },
  MODULES.find((module) => module.id === "clock")!,
  { id: "timer", title: "Таймер", description: "Обратный отсчёт и секундомер", icon: "timer" },
  { id: "battery", title: "Батарея", description: "Заряд и питание из Windows", icon: "battery" },
];
export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  theme: "glass",
  accent: "#edbb64",
  blur: 24,
  opacity: 82,
  glass: 65,
  speed: 1,
  scale: 100,
  topOffset: 20,
  autoCollapse: true,
  autoMedia: true,
  autoHide: false,
  reducedMotion: false,
  notificationBehavior: "queue",
  defaultModule: "clock",
  modules: MODULES.map(({ id }) => ({ id, enabled: true })),
};
export const ACCENTS = [
  "#edbb64",
  "#aaabf7",
  "#91bfae",
  "#e6a4af",
  "#86b7dc",
  "#c2c5ca",
];
export const STORAGE_KEY = "dynamic-island:desktop:settings:v1";
/** Delays are shared so behavior and its description stay in sync. */
export const COLLAPSE_DELAY = 8000;
export const HIDE_DELAY = 5000;
export const FOCUS_DURATION = 25 * 60;
