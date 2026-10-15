import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.ts';
import { Spinner } from './components/ui/spinner.tsx';
import { NotFound } from './pages/NotFound/NotFound.tsx';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: () => <Spinner />,
  defaultNotFoundComponent: () => <NotFound />,
});

console.log(
  '%cHey, you opened the console. You’re my kind of person.%c\nSay hi: mail@timmarkfeld.com · Try the Konami code on the hero.',
  'font: 600 14px/1.6 system-ui; color: #3aa0e6',
  'font: 12px/1.6 ui-monospace, monospace; color: inherit',
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
