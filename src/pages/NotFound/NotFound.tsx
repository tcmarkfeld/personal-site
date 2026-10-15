import { Link, useLocation } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { ROUTES } from '@/Navigation/routeEnum';
import { menuShortcut, setSiteState } from '@/lib/siteState';
import { useDarkTheme } from '@/lib/theme';
import '@/pages/Home/Home.css';
import './NotFound.css';

const waves = [
  [120, 60],
  [200, 44],
  [196, 204],
  [128, 198],
  [356, 178],
  [228, 98],
];

export function NotFound() {
  const dark = useDarkTheme();
  const { pathname } = useLocation();
  const path = pathname.length > 32 ? `${pathname.slice(0, 31)}…` : pathname;

  return (
    <div className="site lost" data-theme={dark ? 'dark' : 'light'}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <div className="edge-fade" aria-hidden="true" />
      <main className="column" id="main">
        <figure className="lost-chart">
          {/* A nautical chart: the shore you left, and the page that drifted off. */}
          <svg
            viewBox="0 0 400 250"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="lost-beam" x1="0" x2="1">
                <stop offset="0" stopColor="var(--accent)" stopOpacity="0.5" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="lost-grid" d="M0 125h400M200 0v250" />
            <path
              className="lost-contour"
              d="M0 52c40 2 66 30 88 56s38 66 28 90-26 36-20 52"
            />
            <path
              className="lost-shore"
              d="M0 66c30 2 50 26 68 46s28 56 20 78-22 40-16 60H0Z"
            />
            <path
              className="lost-beam"
              d="M55 112 185 92v40Z"
              fill="url(#lost-beam)"
              stroke="none"
            />
            <path className="lost-tower" d="M50 140l2-24h6l2 24Z" />
            <path d="M51 116h8l-4-6Z" />
            <circle cx="55" cy="112" r="2.4" className="lost-lamp" />
            <path
              className="lost-course"
              d="M64 150c46 20 56-30 96-15s60 55 90 25 38-34 58-22"
            />
            {waves.map(([x, y], i) => (
              <path
                key={i}
                className="lost-wave"
                d={`M${x} ${y}q5-4 10 0t10 0`}
                style={{ animationDelay: `${i * -0.7}s` }}
              />
            ))}
            <g className="lost-compass">
              <circle cx="352" cy="70" r="20" />
              <path d="M352 46v4M352 90v4M328 70h4M372 70h4" />
              <text x="349.5" y="41">
                N
              </text>
              <g className="lost-needle">
                <path d="m352 56 4 14h-8Z" className="lost-north" />
                <path d="m352 84 4-14h-8Z" />
              </g>
            </g>
            <g transform="translate(296 104) scale(0.42)">
              <g className="lost-boat">
                <path d="M58 8v58" />
                <path d="M58 12 26 58h32Z" className="lost-sail" />
                <path d="M62 20l26 38H62Z" className="lost-sail-accent" />
                <path d="M14 66h92l-12 14H28Z" className="lost-sail" />
              </g>
            </g>
            <path
              className="lost-arrow"
              d="M286 188c-10-10-4-30 16-42m-7-1 7 1-1 7"
            />
            <text className="lost-note" x="262" y="206">
              you are here?
            </text>
          </svg>
          <Link
            className="hotspot lost-home-spot"
            to={ROUTES.HOME}
            aria-label="Back to shore"
            viewTransition
          >
            <span className="hotspot-card">Shore · back to the homepage</span>
          </Link>
        </figure>

        <p className="lost-code">Error 404</p>
        <h1>This page drifted out to sea.</h1>
        <p>
          Nothing’s broken on your end. <code>{path}</code> isn’t on any chart,
          so let’s get you back to shore.
        </p>
        <div className="lost-actions">
          <Link className="chip" to={ROUTES.HOME} viewTransition>
            <ArrowLeft size={13} aria-hidden="true" /> Back to shore
          </Link>
          <Link className="chip" to={ROUTES.BLOG} viewTransition>
            Read the blog <ArrowRight size={13} aria-hidden="true" />
          </Link>
          <button
            className="chip"
            type="button"
            onClick={() => setSiteState({ menu: true })}
          >
            <Search size={13} aria-hidden="true" /> Search
            <kbd className="lost-shortcut">{menuShortcut}</kbd>
          </button>
        </div>
      </main>
    </div>
  );
}
