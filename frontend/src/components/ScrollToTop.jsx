import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component ensures that the window scrolls to the top
 * whenever the route changes. This prevents the issue where navigating
 * to a new page retains the scroll position from the previous page.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top-left corner of the page on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname]);

  // This component does not render any visible UI
  return null;
};

export default ScrollToTop;
