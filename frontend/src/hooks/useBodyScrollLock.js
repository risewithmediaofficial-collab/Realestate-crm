import { useEffect } from 'react';

/**
 * Custom hook to lock body and html scrolling when a popup or modal is open.
 * Restores original scroll behavior cleanly on unmount or when isOpen becomes false.
 */
export function useBodyScrollLock(isLocked = true) {
  useEffect(() => {
    if (!isLocked) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    // Lock scrolling on both body and html
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('no-scroll', 'modal-open');
    document.documentElement.classList.add('no-scroll', 'modal-open');

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.classList.remove('no-scroll', 'modal-open');
      document.documentElement.classList.remove('no-scroll', 'modal-open');
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
