import { useCallback, useEffect, useState } from "react";

type AsyncState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "error"; data?: undefined; error: unknown }
  | { status: "success"; data: T; error?: undefined };

/** Runs `fn` on mount and whenever `deps` change; exposes loading/error/data plus a manual `reload`. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Resets state back to "loading" when deps/reloadToken change (e.g. a
    // previous "success"/"error" must not linger while refetching). On the
    // very first run this duplicates the initial useState value, which is
    // the harmless "extra render" this rule normally guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    fn()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) console.error("[useAsync] fetch failed:", error);
        if (!cancelled) setState({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  return { ...state, reload };
}
