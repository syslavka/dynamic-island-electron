import { MediaModule } from "../modules/MediaModule";
import { ClockModule } from "../modules/ClockModule";
import { SoundModule } from "../modules/SoundModule";
import { NotificationModule } from "../modules/NotificationModule";
import { TimerModule } from "../modules/TimerModule";
import { BatteryModule } from "../modules/BatteryModule";
import { WeatherModule } from "../modules/WeatherModule";
import {
  ActionsModule,
  CalendarModule,
  CallModule,
} from "../modules/OtherModules";
import { ScreenRecordingModule } from '../modules/ScreenRecordingModule';
import { FileTransferModule } from '../modules/FileTransferModule';
import { SystemModule } from '../modules/SystemModule';
import type { IslandController } from "../../hooks/useDynamicIsland";
import type { ModuleId } from "../../types";
import type { ComponentType } from "react";
import { useActivityTransition } from '../../hooks/useActivityTransition';

/** Register a module here and in data/defaults.ts. No shell changes needed. */
const MODULE_COMPONENTS: Record<
  ModuleId | "call",
  ComponentType<{ island: IslandController }>
> = {
  clock: ClockModule,
  media: MediaModule,
  sound: SoundModule,
  notifications: NotificationModule,
  timer: TimerModule,
  battery: BatteryModule,
  weather: WeatherModule,
  calendar: CalendarModule,
  recording: ScreenRecordingModule,
  transfers: FileTransferModule,
  system: SystemModule,
  actions: ActionsModule,
  call: CallModule,
};
export function IslandContent({ island }: { island: IslandController }) {
  const { displayed, leaving, pending } = useActivityTransition(island.active);
  const Component = MODULE_COMPONENTS[displayed];
  return <div className={`activity-transition ${leaving ? 'activity-leaving' : ''}`} inert={pending} aria-hidden={pending} data-displayed-activity={displayed}>
    <Component key={displayed} island={island} />
  </div>;
}
