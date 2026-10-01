import { useEffect } from 'react';

/**
 * Adds 'is-resizing' class to document.body during resize to suppress layout transitions
 */
export function useWindowResize() {
  useEffect(() => {
    let resizeTimer = null;

    const handleResize = () => {
      document.body.classList.add('is-resizing');
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.body.classList.remove('is-resizing');
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
}
