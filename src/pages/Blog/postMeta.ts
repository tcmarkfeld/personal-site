// Plain post data with no React imports, so the build can read it too when it
// writes each post's share tags (see vite.config.ts).
export type PostMeta = {
  slug: string;
  title: string;
  kicker: string;
  icon: string;
  date: string;
  summary: string;
  share: { image: string; alt: string };
};

export const blogDescription =
  'Write-ups on things I’ve built: how they work and what I learned.';

// Newest first.
export const postMeta: PostMeta[] = [
  {
    slug: 'revise',
    title: 'Editing a PDF like it’s a doc',
    kicker: 'Revise · Project',
    icon: '/revise/icon-64.webp',
    date: '2026-10-05',
    summary:
      'Why I built Revise, and how it turns a PDF back into something you can actually edit.',
    share: {
      image: '/blog/revise-share.png',
      alt: 'Revise, a native Mac app for editing PDFs like a document, shown editing a resume',
    },
  },
  {
    slug: 'corolla-ice-delivery',
    title: 'Routing ice across the Outer Banks',
    kicker: 'Corolla Ice Delivery',
    icon: '/corolla_ice_delivery_logo.webp',
    date: '2026-09-26',
    summary:
      'How I routed ice deliveries around Corolla to avoid left turns, and the up to three hours it saved a day.',
    share: {
      image: '/blog/corolla-share.png',
      alt: 'Screens from the Corolla Ice Delivery app: today’s route and the deliveries list',
    },
  },
];
