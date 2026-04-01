'use client';

import { useEffect, useRef, useState } from 'react';

export function usePolling(action: () => Promise<void>, intervalMs = 5000) {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const execute = async () => {
      try {
        await action();
        if (!isMountedRef.current) return;
        setError(null);
        setLastUpdatedAt(new Date());
      } catch (reason) {
        if (!isMountedRef.current) return;
        setError(reason instanceof Error ? reason.message : 'Polling failed.');
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    execute();
    const interval = setInterval(execute, intervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [action, intervalMs]);

  return { isLoading, lastUpdatedAt, error };
}
