import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tiny server-state hook: fetch on mount / when deps change, expose refetch.
 * A ref keeps the latest fetcher without re-running the effect on every render.
 */
export function useApi(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: enabled, error: null });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, meta: null, loading: false, error: null });
      return undefined;
    }
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    Promise.resolve()
      .then(() => fetcherRef.current())
      .then((result) => {
        if (!alive) return;
        setState({ data: result?.data ?? null, meta: result?.meta ?? null, loading: false, error: null });
      })
      .catch((error) => {
        if (!alive) return;
        setState({ data: null, meta: null, loading: false, error });
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, refetch };
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
}
