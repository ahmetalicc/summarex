import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://summarex.app';

/** Sets document.title and points <link rel="canonical"> at the current route. */
export function usePageMeta(title: string) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = `${SITE_URL}${pathname}`;
  }, [pathname]);
}
