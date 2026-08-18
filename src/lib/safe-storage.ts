/** localStorage wrapper that never throws QuotaExceededError out of a click handler. */
export const safeStorage = {
  getItem(name: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      try {
        window.localStorage.removeItem(name);
        window.localStorage.setItem(name, value);
      } catch {
        /* quota still exceeded — drop the write */
      }
    }
  },
  removeItem(name: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};
