import type { IslandController } from '../../hooks/useDynamicIsland';
import { applicationName } from '../../hooks/useSystemActivity';
import { Icon } from '../Icon';

export function SystemModule({ island }: { island: IslandController }) {
  const { snapshot: system, setMute, busy, error } = island.systemActivity;
  const devices = system?.bluetooth?.devices ?? [];
  const render = system?.audio?.renderMuted;
  const capture = system?.audio?.captureMuted;
  return <div className="native-system-module module-enter">
    {!system && <p role="status">Получаем доступные события Windows…</p>}
    {(['microphone', 'camera'] as const).map(kind => <div className="system-status-row" key={kind}>
      <Icon name={kind === 'camera' ? 'camera' : 'mic'} size={18} />
      <div><strong>{kind === 'camera' ? 'Камера' : 'Микрофон'} · {system?.[kind]?.active ? 'используется' : system?.capabilities[kind].available ? 'нет активности' : 'статус недоступен'}</strong><small>{system?.[kind]?.active ? system[kind]?.apps.map(applicationName).join(', ') : 'По данным Windows · не все приложения сообщают статус'}</small></div>
      <button aria-label={kind === 'camera' ? 'Доступ к камере' : 'Доступ к микрофону'} onClick={() => void window.desktop?.openSystemPage(kind)}><Icon name="external" size={13} /></button>
    </div>)}
    <div className="system-status-row"><Icon name={render ? 'mute' : 'volume'} size={18} /><div><strong>Звук · {render == null ? 'недоступен' : render ? 'выключен' : 'включён'}</strong><small>Текущее устройство воспроизведения Windows</small></div><button aria-label={render ? 'Включить звук Windows' : 'Выключить звук Windows'} disabled={render == null || busy} onClick={() => void setMute(!render)}><Icon name={render ? 'volume' : 'mute'} size={14} /></button></div>
    <div className="system-status-row"><Icon name="mic" size={18} /><div><strong>Микрофон · {capture == null ? 'недоступен' : capture ? 'заглушён' : 'звук включён'}</strong><small>Системное устройство записи</small></div><button aria-label={capture ? 'Включить микрофон Windows' : 'Заглушить микрофон Windows'} disabled={capture == null || busy} onClick={() => void setMute(!capture, 'capture')}><Icon name={capture ? 'mic' : 'mute'} size={14} /></button></div>
    {devices.map(device => <div className="system-status-row" key={device.id}><Icon name={/airpods|head|buds/i.test(device.name) ? 'headphones' : 'bluetooth'} size={18} /><div><strong>{device.name || 'Bluetooth-устройство'}</strong><small>Подключено · {device.batteryAvailable ? `${device.batteryPercent}%` : 'устройство не передало заряд'}</small></div></div>)}
    {!devices.length && <div className="system-status-row"><Icon name="bluetooth" size={18} /><div><strong>Bluetooth</strong><small>{system?.capabilities.bluetooth.available ? 'Подключённых устройств нет' : 'Windows не предоставила полный список'}</small></div><button aria-label="Открыть Bluetooth" onClick={() => void window.desktop?.openSystemPage('bluetooth')}><Icon name="external" size={13} /></button></div>}
    {system?.foreground && <div className="system-status-row"><Icon name="monitor" size={18} /><div><strong>{system.foreground.name || 'Активное приложение'}</strong><small>{system.foreground.title}</small></div></div>}
    {error && <p role="alert">{error}</p>}
    <details><summary>Доступность функций</summary><p>Микрофон и камера: индикаторы по сведениям Windows, могут быть неполными. Заряд AirPods: только если драйвер его передаёт. Запись и копирование: действия, начатые в острове. Звонки, маршруты и передачи сторонних приложений требуют отдельной интеграции; их статусы не угадываются. Стекло ограничено поверхностью острова; размытие рабочего стола и оптика Apple не имитируются системным фоном окна.</p></details>
  </div>;
}
