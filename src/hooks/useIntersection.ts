import { type RefObject, useEffect } from 'react';

export function useIntersection(
  ref: RefObject<Element | null>,
  onIntersect: () => void,
  options?: IntersectionObserverInit
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onIntersect();
      }
    }, options);

    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, onIntersect, options]);
}
