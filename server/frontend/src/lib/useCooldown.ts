import { useEffect, useRef, useState } from "react";

export function useCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  function start(seconds: number) {
    setSecondsLeft(seconds);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  return { secondsLeft, start };
}
