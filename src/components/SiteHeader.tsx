import { Link, useLocation } from '@tanstack/react-router';
import { House, Moon, NotebookPen, Search, Sun } from 'lucide-react';
import { ROUTES } from '@/Navigation/routeEnum';
import { setSiteState } from '@/lib/siteState';
import { setDarkTheme, useDarkTheme } from '@/lib/theme';

// A floating pill of icon buttons, pinned to the top of every page.
export function SiteHeader() {
  const dark = useDarkTheme();
  const { pathname } = useLocation();
  const themeLabel = dark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <header className="pill-nav">
      {/* Bends the page behind the glass like rippled glass. Used by Chromium
          browsers; others keep a frosted blur. */}
      <svg className="pill-glass-filter" aria-hidden="true">
        <filter id="liquid-glass" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.02"
            numOctaves="2"
            seed="4"
          />
          <feGaussianBlur stdDeviation="2" />
          <feDisplacementMap
            in="SourceGraphic"
            scale="26"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <nav aria-label="Main navigation">
        <Link
          to={ROUTES.HOME}
          hash="top"
          aria-label="Home"
          aria-current={pathname === ROUTES.HOME ? 'page' : undefined}
          viewTransition
        >
          <House size={15} />
        </Link>
        <Link
          to={ROUTES.BLOG}
          aria-label="Blog"
          aria-current={pathname.startsWith(ROUTES.BLOG) ? 'page' : undefined}
          viewTransition
        >
          <NotebookPen size={15} />
        </Link>
      </nav>
      <span className="pill-divider" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setSiteState({ menu: true })}
        aria-label="Open command menu"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search size={15} />
      </button>
      <button
        type="button"
        onClick={() => setDarkTheme(!dark)}
        aria-label={themeLabel}
        aria-pressed={dark}
      >
        {dark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}
