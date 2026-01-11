
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useServerTime(intervalMs = 60000) {
  const [serverTime, setServerTime] = useState(null);

  useEffect(() => {
    let timer;

    const fetchTime = async () => {
      try {
        const data = await api.serverTime();
        setServerTime(new Date(data.now));
      } catch {
        // ignore
      }
    };

    fetchTime();
    timer = setInterval(fetchTime, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return serverTime;
}

export function isOrderAllowed(date) {
  if (!date) return false;
  const hour = date.getHours();
  const minute = date.getMinutes();

  const afterStart = hour > 8 || (hour === 8 && minute >= 0);
  const beforeEnd = hour < 11 || (hour === 11 && minute <= 30);
  return afterStart && beforeEnd;
}

export function isPickupTime(date) {
  if (!date) return false;
  const h = date.getHours();
  const m = date.getMinutes();

  const afterStart = h > 12 || (h === 12 && m >= 15);
  const beforeEnd = h < 12 || (h === 12 && m <= 55);
  return afterStart && beforeEnd;
}
