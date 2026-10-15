import fs from 'node:fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { tanstackRouter } from '@tanstack/router-vite-plugin';
import { blogDescription, postMeta } from './src/pages/Blog/postMeta';

const site = 'https://timmarkfeld.com';

type SharePage = {
  path: string;
  title: string;
  description: string;
  type: 'website' | 'article';
  image?: { url: string; alt: string };
};

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function setMeta(html: string, key: string, value: string) {
  const name = key.replace(/[.:]/g, '\\$&');
  const tag = new RegExp(
    `(<meta\\s+(?:name|property)="${name}"\\s+content=")[^"]*(")`,
  );
  if (!tag.test(html)) throw new Error(`index.html has no ${key} meta tag`);
  return html.replace(tag, `$1${escapeAttribute(value)}$2`);
}

// Link previews (LinkedIn, X, Slack, iMessage) read static HTML and never run
// the app, so each blog page gets its own copy of index.html with its own
// title, description, and image. Netlify serves these before the SPA fallback.
function sharePages(): Plugin {
  return {
    name: 'share-pages',
    apply: 'build',
    writeBundle({ dir = 'dist' }) {
      const base = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
      const pages: SharePage[] = [
        {
          path: '/blog/',
          title: 'Blog | Timothy Markfeld',
          description: blogDescription,
          type: 'website',
        },
        ...postMeta.map((post) => ({
          path: `/blog/${post.slug}/`,
          title: `${post.title} | Timothy Markfeld`,
          description: post.summary,
          type: 'article' as const,
          image: { url: `${site}${post.share.image}`, alt: post.share.alt },
        })),
      ];

      for (const page of pages) {
        const url = `${site}${page.path}`;
        let html = base
          .replace(
            /<title>[^<]*<\/title>/,
            `<title>${escapeAttribute(page.title)}</title>`,
          )
          .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
        html = setMeta(html, 'description', page.description);
        html = setMeta(html, 'og:type', page.type);
        html = setMeta(html, 'og:title', page.title);
        html = setMeta(html, 'og:description', page.description);
        html = setMeta(html, 'og:url', url);
        html = setMeta(html, 'twitter:title', page.title);
        html = setMeta(html, 'twitter:description', page.description);
        if (page.image) {
          html = setMeta(html, 'og:image', page.image.url);
          html = setMeta(html, 'og:image:type', 'image/png');
          html = setMeta(html, 'og:image:width', '1200');
          html = setMeta(html, 'og:image:height', '630');
          html = setMeta(html, 'og:image:alt', page.image.alt);
          html = setMeta(html, 'twitter:image', page.image.url);
          html = setMeta(html, 'twitter:image:alt', page.image.alt);
        }
        const out = path.join(dir, page.path, 'index.html');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, html);
      }

      // The sitemap lists the same canonical, trailing-slash URLs as the pages.
      const latest = postMeta
        .map((post) => post.date)
        .sort()
        .at(-1);
      const urls = [
        { loc: `${site}/`, lastmod: latest },
        { loc: `${site}/blog/`, lastmod: latest },
        ...postMeta.map((post) => ({
          loc: `${site}/blog/${post.slug}/`,
          lastmod: post.date,
        })),
      ];
      fs.writeFileSync(
        path.join(dir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map(
            ({ loc, lastmod }) =>
              `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`,
          )
          .join('\n')}\n</urlset>\n`,
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tanstackRouter(), sharePages()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
