import { useEffect, useState } from 'react';

export function useIntersectionObserver(ref, options = { rootMargin: '200px' }) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsIntersecting(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
}
