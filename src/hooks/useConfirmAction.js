import { useCallback, useEffect, useRef, useState } from 'react';

// two-step "click twice" confirm for destructive admin actions — arms on the
// first click (button relabels), then runs on a second click within 4s
export function useConfirmAction() {
  const [armedKey, setArmedKey] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const trigger = useCallback((key, action) => {
    if (armedKey === key) {
      clearTimeout(timeoutRef.current);
      setArmedKey(null);
      action();
    } else {
      setArmedKey(key);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setArmedKey(null), 4000);
    }
  }, [armedKey]);

  return [armedKey, trigger];
}
