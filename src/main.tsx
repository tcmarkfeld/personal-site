import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.ts';
import { Spinner } from './components/ui/spinner.tsx';
import { NotFound } from './pages/NotFound/NotFound.tsx';
import { playSound } from './lib/uiSounds.ts';
import { noteNavigation } from './lib/useReveal.ts';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: () => <Spinner />,
  defaultNotFoundComponent: () => <NotFound />,
});

// A soft page-turn sound on every route change after the first load.
router.subscribe('onBeforeNavigate', ({ pathChanged, fromLocation }) => {
  if (fromLocation && pathChanged) {
    noteNavigation();
    playSound('navigate');
  }
});
// The router never sees links that leave the site or open a new tab, so they
// get the same sound here.
document.addEventListener('click', (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
    'a[href]',
  );
  if (!link) return;
  if (link.target === '_blank' || link.origin !== location.origin)
    playSound('navigate');
});

console.log(
  '%cHey, you opened the console. You’re my kind of person.%c\nSay hi: mail@timmarkfeld.com',
  'font: 600 14px/1.6 system-ui; color: #3aa0e6',
  'font: 12px/1.6 ui-monospace, monospace; color: inherit',
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
