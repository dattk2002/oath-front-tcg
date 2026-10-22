import { useEffect, useState } from "react";
/** Only display countdowns locally; server time and revalidation own availability. */
export function useServerClock(serverNow: string | undefined) {
  const [clock, setClock] = useState({
    source: serverNow,
    value: serverNow ? Date.parse(serverNow) : 0,
  });
  useEffect(() => {
    if (!serverNow) return;
    const base = Date.parse(serverNow),
      observed = performance.now();
    const tick = () =>
      setClock({
        source: serverNow,
        value: base + performance.now() - observed,
      });
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [serverNow]);
  return clock.source === serverNow
    ? clock.value
    : serverNow
      ? Date.parse(serverNow)
      : 0;
}
