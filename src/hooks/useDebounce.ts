import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Pure debounce helper function for standard JavaScript closures.
 */
export function debounce<Args extends any[]>(
  fn: (...args: Args) => void,
  waitMs: number
): { (...args: Args): void; cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  const debounced = (...args: Args) => {
    lastArgs = args;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (lastArgs !== null) {
        fn(...lastArgs);
        lastArgs = null;
      }
      timeoutId = null;
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timeoutId !== null && lastArgs !== null) {
      clearTimeout(timeoutId);
      fn(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debounced;
}

/**
 * Custom React Hook: Debounces a rapidly changing value (e.g., search text input).
 * Ensures smooth typing feedback while throttling downstream heavy computations and API calls.
 *
 * @param value - The input value to debounce
 * @param delayMs - Delay in milliseconds (default 250ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delayMs = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Custom React Hook: Returns a debounced callback with lifecycle controls (cancel, flush, isPending).
 */
export function useDebouncedCallback<Args extends any[]>(
  callback: (...args: Args) => void,
  delayMs = 250
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const argsRef = useRef<Args | null>(null);
  const [isPending, setIsPending] = useState(false);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    argsRef.current = null;
    setIsPending(false);
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current !== null && argsRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      callbackRef.current(...argsRef.current);
      argsRef.current = null;
      setIsPending(false);
    }
  }, []);

  const run = useCallback(
    (...args: Args) => {
      argsRef.current = args;
      setIsPending(true);

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        if (argsRef.current !== null) {
          callbackRef.current(...argsRef.current);
          argsRef.current = null;
        }
        timerRef.current = null;
        setIsPending(false);
      }, delayMs);
    },
    [delayMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { run, cancel, flush, isPending };
}
