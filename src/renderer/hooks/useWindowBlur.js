import { useEffect } from 'react';

/**
 * Manages 'window-blurred' class on document.body based on window focus/blur state
 */
export function useWindowBlur() {
  useEffect(() => {
    const handleFocus = () => document.body.classList.remove('window-blurred');
    const handleBlur = () => document.body.classList.add('window-blurred');

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    if (!document.hasFocus()) {
      document.body.classList.add('window-blurred');
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
}
