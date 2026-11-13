import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import type { SystemInfo } from "../../desktop";

export function BatteryModule() {
  const [system, setSystem] = useState<SystemInfo | null>(null);
  useEffect(() => {
    let mounted = true;
    const refresh = () => window.desktop?.getSystem().then((value) => { if (mounted) setSystem(value); }).catch(() => { if (mounted) setSystem(null); });
    refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);
  const level = system?.battery;
  return <div className="simple-module module-enter native-battery"><Icon name={system?.onBattery ? "battery" : "bolt"} size={36} /><h3>{level == null ? "—" : level}{level != null && <span className="percent">%</span>}</h3><p>{!system ? "Получаем данные Windows…" : level == null ? "Windows не сообщает заряд батареи" : system.onBattery ? "Питание от батареи" : "Подключено к электросети"}</p><span>Данные вашего компьютера</span></div>;
}
