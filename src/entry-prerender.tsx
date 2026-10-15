import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { renderToString } from 'react-dom/server';
import { routeTree } from './routeTree.gen.ts';

// Renders one route to HTML at build time, so the page's text is in the file
// for crawlers and agents that read it without running the app.
export async function render(url: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}
