import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { DOMAINS, type View } from '../domain/models';

const key = (space: string, page: View) => `${space}:${page}`;

export function viewFromHash(): View {
  const value = window.location.hash.slice(1);
  return DOMAINS.some((domain) => domain.id === value) ? (value as View) : 'overview';
}

export function usePageNavigation({
  spaceId,
  ready,
  prepare,
  onChange,
  notify,
}: {
  spaceId: string;
  ready: boolean;
  prepare: (view: View) => Promise<void>;
  onChange: (view: View) => void;
  notify: (message: string) => void;
}) {
  const [view, setView] = useState<View>(viewFromHash);
  const [activeView, setActiveView] = useState(view);
  const [pending, setPending] = useState(false);
  const rendered = useRef(view);
  const requested = useRef(view);
  const scope = useRef(spaceId);
  const positions = useRef(new Map<string, number>());
  const intent = useRef(0);
  const transition = useRef<ViewTransition | null>(null);
  const animations = useRef<Animation[]>([]);

  const cancelMotion = useCallback(() => {
    transition.current?.skipTransition();
    transition.current = null;
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
  }, []);

  useLayoutEffect(() => {
    if (!ready || scope.current === spaceId) return;
    scope.current = spaceId;
    cancelMotion();
    window.scrollTo({
      top: positions.current.get(key(spaceId, rendered.current)) ?? 0,
      behavior: 'instant',
    });
  }, [spaceId, ready, cancelMotion]);

  const changePage = useCallback(
    async (next: View) => {
      if (requested.current === next) return;
      const request = ++intent.current;
      requested.current = next;
      positions.current.set(key(scope.current, rendered.current), window.scrollY);
      cancelMotion();
      setActiveView(next);
      setPending(true);
      try {
        await prepare(next);
      } catch {
        if (request !== intent.current) return;
        requested.current = rendered.current;
        window.history.replaceState(null, '', `#${rendered.current}`);
        setActiveView(rendered.current);
        setPending(false);
        notify('模块暂时无法打开，请重试。当前记录保持原样。');
        return;
      }
      if (request !== intent.current) return;
      const targetY = positions.current.get(key(scope.current, next)) ?? 0;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let applied = false;
      const apply = () => {
        if (request !== intent.current || applied) return;
        applied = true;
        rendered.current = next;
        flushSync(() => {
          setView(next);
          setPending(false);
          onChange(next);
        });
        window.scrollTo({ top: targetY, behavior: 'instant' });
        const focused = document.activeElement;
        if (
          !focused ||
          focused === document.body ||
          focused.closest('.navigation') ||
          focused.id === 'page-title'
        )
          document.getElementById('page-title')?.focus({ preventScroll: true });
      };
      const enter = () => {
        if (
          request !== intent.current ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        )
          return;
        const content = document.querySelector<HTMLElement>('.route-content');
        if (content?.animate)
          animations.current.push(
            content.animate(
              [
                { opacity: 0.35, transform: 'translateY(6px)' },
                { opacity: 1, transform: 'translateY(0)' },
              ],
              { duration: 200, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
            ),
          );
        const title = document.querySelector<HTMLElement>('.route-title');
        if (title?.animate)
          animations.current.push(
            title.animate([{ opacity: 0.4 }, { opacity: 1 }], {
              duration: 120,
              easing: 'ease-out',
            }),
          );
      };
      // Large scroll changes use an entrance only, so snapshots never stretch across screens.
      if (
        !reduce &&
        Math.abs(window.scrollY - targetY) < 32 &&
        typeof document.startViewTransition === 'function'
      ) {
        try {
          const current = document.startViewTransition(apply);
          transition.current = current;
          void current.ready.catch(() => {
            if (applied) enter();
          });
          void current.finished
            .catch(() => {})
            .finally(() => {
              if (transition.current === current) transition.current = null;
            });
        } catch {
          apply();
          enter();
        }
      } else {
        apply();
        if (!reduce) enter();
      }
    },
    [cancelMotion, notify, onChange, prepare],
  );

  const navigate = useCallback(
    (next: View) => {
      if (requested.current === next) return;
      window.history.pushState(null, '', `#${next}`);
      void changePage(next);
    },
    [changePage],
  );

  const invalidate = useCallback(() => {
    ++intent.current;
    cancelMotion();
  }, [cancelMotion]);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduce = () => {
      if (media.matches) cancelMotion();
    };
    const remember = () =>
      positions.current.set(key(scope.current, rendered.current), window.scrollY);
    const change = () => {
      const next = viewFromHash();
      if (window.location.hash !== `#${next}`) window.history.replaceState(null, '', `#${next}`);
      void changePage(next);
    };
    change();
    window.addEventListener('scroll', remember, { passive: true });
    window.addEventListener('popstate', change);
    window.addEventListener('hashchange', change);
    media.addEventListener('change', reduce);
    return () => {
      invalidate();
      window.history.scrollRestoration = previous;
      window.removeEventListener('scroll', remember);
      window.removeEventListener('popstate', change);
      window.removeEventListener('hashchange', change);
      media.removeEventListener('change', reduce);
    };
  }, [cancelMotion, changePage, invalidate]);

  return { view, activeView, navigate, pending };
}
