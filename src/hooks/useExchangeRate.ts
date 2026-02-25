import { useState, useEffect, useCallback } from "react";

const FALLBACK_RATE = 10.85; // EUR → MAD fallback rate
const CACHE_KEY = "eur_mad_rate";
const CACHE_DURATION = 3600000; // 1 hour in ms

interface CachedRate {
  rate: number;
  timestamp: number;
}

function getCachedRate(): number | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed: CachedRate = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_DURATION) return null;
    return parsed.rate;
  } catch {
    return null;
  }
}

function setCachedRate(rate: number) {
  try {
    const data: CachedRate = { rate, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage not available
  }
}

async function fetchRate(): Promise<number> {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/EUR");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const rate = data?.rates?.MAD;
    if (typeof rate === "number" && rate > 0) {
      setCachedRate(rate);
      return rate;
    }
    throw new Error("Invalid rate");
  } catch {
    // Fallback: try a second API
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/EUR");
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const rate = data?.rates?.MAD;
      if (typeof rate === "number" && rate > 0) {
        setCachedRate(rate);
        return rate;
      }
    } catch {
      // Both APIs failed
    }
    return FALLBACK_RATE;
  }
}

export function useExchangeRate() {
  const [rate, setRate] = useState<number>(() => getCachedRate() || FALLBACK_RATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = getCachedRate();
    if (cached) {
      setRate(cached);
      setLoading(false);
      return;
    }
    fetchRate().then((r) => {
      setRate(r);
      setLoading(false);
    });
  }, []);

  const toDH = useCallback(
    (eurAmount: number): number => Math.round(eurAmount * rate),
    [rate]
  );

  return { rate, loading, toDH };
}
