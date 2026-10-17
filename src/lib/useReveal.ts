import { useEffect, useLayoutEffect, type RefObject } from 'react';

// Sections fade in as they scroll into view, but only on the first page of a
// visit. A page reached by navigating shows them at once, so the page-change
// cross-fade carries the whole page instead of it arriving in two passes.
let navigated = false;
export function noteNavigation() {
  navigated = true;
}

// Marks [data-reveal] children as revealed once, the first time they scroll in.
export function useReveal(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    if (!navigated) return;
    root.current
      ?.querySelectorAll<HTMLElement>('[data-reveal]')
      .forEach((element) => (element.dataset.reveal = 'shown'));
  }, [root]);

  useEffect(() => {
    const container = root.current;
    if (!container || navigated) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.reveal = 'shown';
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    container
      .querySelectorAll('[data-reveal]')
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [root]);
}
