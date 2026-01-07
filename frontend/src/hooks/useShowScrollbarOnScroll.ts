import { useEffect } from 'react';

/**
 * Adds and removes the 'thin-scrollbar--visible' class on scroll to show the custom scrollbar
 * only during scrolling interactions. Works for mouse, touch, and keyboard scroll.
 *
 * @param element - The scrollable element (e.g., a div with overflow-x-auto)
 * @param hideDelayMs - Delay after last scroll event before hiding the scrollbar
 */
export function attachShowScrollbarOnScroll(
  element: HTMLElement | null,
  hideDelayMs: number = 900
) {
  if (!element) return;
  let hideTimer: number | undefined;

  const show = () => {
    element.classList.add('thin-scrollbar--visible');
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      element.classList.remove('thin-scrollbar--visible');
    }, hideDelayMs);
  };

  // Use passive listener for better touch performance
  element.addEventListener('scroll', show, { passive: true });

  return () => {
    element.removeEventListener('scroll', show);
    if (hideTimer) window.clearTimeout(hideTimer);
  };
}

export default function useShowScrollbarOnScroll(
  ref: React.RefObject<HTMLElement>,
  hideDelayMs: number = 900
) {
  useEffect(() => {
    const el = ref.current;
    const cleanup = attachShowScrollbarOnScroll(el, hideDelayMs);
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, hideDelayMs]);
}
