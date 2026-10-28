import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { View } from '../domain/models';

export function NavigationIndicator({
  active,
  navigation,
}: {
  active: View;
  navigation: RefObject<HTMLElement | null>;
}) {
  const indicator = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const nav = navigation.current;
    const marker = indicator.current;
    if (!nav || !marker) return;
    const measure = () => {
      const selected = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!selected) return;
      marker.style.width = `${selected.offsetWidth}px`;
      marker.style.height = `${selected.offsetHeight}px`;
      marker.style.transform = `translate3d(${selected.offsetLeft}px, ${selected.offsetTop}px, 0)`;
      marker.dataset.ready = 'true';
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [active, navigation]);
  return <span ref={indicator} className="nav-indicator" aria-hidden="true" />;
}
