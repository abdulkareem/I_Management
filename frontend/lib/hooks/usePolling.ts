'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchData } from '@/lib/api';

export function usePolling<T>(endpoint: string | null, interval = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!endpoint) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const json = await fetchData<T>(endpoint);
        if (!mounted) return;
        setData(json);
        setError(null);
        setLastUpdatedAt(new Date());
      } catch (reason) {
        if (!mounted) return;
        setError(reason instanceof Error ? reason.message : 'Polling failed.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, interval);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [endpoint, interval]);

  return { data, isLoading, error, lastUpdatedAt };
}

export function usePollingAction(action: () => Promise<void>, intervalMs = 5000) {
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

    void execute();
    const interval = setInterval(() => {
      void execute();
    }, intervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [action, intervalMs]);

  return { isLoading, lastUpdatedAt, error };
}
