// Fills each built page's #root with the app's HTML for that route, so the
// text, experience, and projects are readable without JavaScript. The app
// still mounts with createRoot and replaces this markup on load.
// Run after `vite build`: node scripts/prerender.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const dist = path.resolve('dist');
// The markup is rendered in the light theme; match the visitor's theme before
// the first paint so dark mode doesn't flash light until the app mounts.
const themeSync =
  '<script>document.querySelectorAll("#root [data-theme]").forEach((el) => {' +
  ' el.dataset.theme = document.documentElement.dataset.theme; });</script>';
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const { render } = await vite.ssrLoadModule('/src/entry-prerender.tsx');
  const { postMeta } = await vite.ssrLoadModule('/src/pages/Blog/postMeta.ts');
  const pages = [
    { url: '/', file: 'index.html' },
    { url: '/blog', file: 'blog/index.html' },
    ...postMeta.map((post) => ({
      url: `/blog/${post.slug}`,
      file: `blog/${post.slug}/index.html`,
    })),
  ];

  for (const page of pages) {
    const file = path.join(dist, page.file);
    const html = fs.readFileSync(file, 'utf8');
    const app = await render(page.url);
    if (!html.includes('<div id="root"></div>'))
      throw new Error(`${page.file} has no empty #root`);
    fs.writeFileSync(
      file,
      html.replace(
        '<div id="root"></div>',
        `<div id="root">${app}</div>${themeSync}`,
      ),
    );
    console.log(
      'prerendered',
      page.url,
      `${(app.length / 1024).toFixed(0)} KB`,
    );
  }
} finally {
  await vite.close();
}
