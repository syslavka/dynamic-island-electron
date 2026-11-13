import { useEffect, useState } from "react";

export function useClock() {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setDate(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return date;
}
export function ClockModule() {
  const date = useClock();
  return <div className="clock-module module-enter"><span>ВАШЕ ВРЕМЯ</span><h3>{date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}<small>{date.toLocaleTimeString("ru-RU", { second: "2-digit" })}</small></h3><p>{date.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p><span className="clock-timezone">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>;
}
