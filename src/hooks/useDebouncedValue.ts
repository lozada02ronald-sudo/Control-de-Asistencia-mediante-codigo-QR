import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de un valor cambiante para evitar filtrados o
 * peticiones excesivas en búsquedas y autocompletados.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

