import { useCallback, useEffect, useState } from 'react';
import { api, reportClientIssue } from '../lib/api';

// game content (levels, care methods, fertilizers) now lives in the shared
// database instead of per-browser localStorage — every player reads the same rows
export function useGameConfig() {
  const [config, setConfig] = useState(null); // null while loading
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    // a phone on a flaky connection: try up to 3 times (1s, 2s backoff)
    // before surfacing the error (App shows it with a retry button)
    const attempt = (n) => api.getConfig().catch((e) => {
      if (n >= 2) throw e;
      return new Promise((r) => setTimeout(r, 1000 * (n + 1))).then(() => attempt(n + 1));
    });
    return attempt(0)
      .then((data) => {
        // the rest of the app (ported from the old localStorage shape) keys
        // levels by `id` — the server's row key is `index`, so alias it —
        // and expects careMethods as plain strings, not {index, text} rows
        const levels = data.levels.map((l) => ({ ...l, id: l.index }));
        const careMethods = data.careMethods.map((c) => c.text);
        setConfig({ ...data, levels, careMethods });
        setError(null);
      })
      .catch((e) => { reportClientIssue('load-config', e); setError(e.message || 'load failed'); });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // for optimistic edits: apply a local patch immediately (snappy typing),
  // the caller is responsible for also firing the matching API write
  const setLocal = useCallback((updater) => setConfig((c) => (c ? updater(c) : c)), []);

  return [config, reload, setLocal, error];
}
