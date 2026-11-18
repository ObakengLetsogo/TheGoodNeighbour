import type { ElementType, ReactNode } from 'react';
import { useReveal } from './hooks';

/** Fades its children in as they scroll into view. Content is visible without JavaScript. */
export function Reveal({ as: Tag = 'div', className = '', delay = 0, children }: { as?: ElementType; className?: string; delay?: number; children: ReactNode }) {
  const ref = useReveal<HTMLElement>();
  return <Tag ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</Tag>;
}
