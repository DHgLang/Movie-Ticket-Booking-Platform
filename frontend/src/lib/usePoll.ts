import { useEffect } from "react";

/** Re-run callback on mount and every `intervalMs` (keeps lists fresh without manual refresh). */
export function usePoll(callback: () => void, intervalMs: number, deps: unknown[]) {
  useEffect(() => {
    callback();
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps passed explicitly by caller
  }, deps);
}
