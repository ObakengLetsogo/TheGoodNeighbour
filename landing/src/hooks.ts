import { useEffect, useRef, useState } from 'react';
import { getCover, type Cover } from './api';

/** The live cover rules. `null` while loading or when the API can't be reached (the page then falls back to plain wording). */
export function useCover(): Cover | null {
  const [cover, setCover] = useState<Cover | null>(null);
  useEffect(() => {
    let live = true;
    getCover().then((c) => live && setCover(c)).catch(() => undefined);
    return () => { live = false; };
  }, []);
  return cover;
}

/** Adds the `in` class to an element once it scrolls into view (and straight away for reduced motion). */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.classList.add('in'); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
