import { ArrowUpRight } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { CopyButton } from '@/components/CopyButton';

const ReviseBench = lazy(() =>
  import('./ReviseBench').then((module) => ({ default: module.ReviseBench })),
);

const brewCommand = 'brew install --cask tcmarkfeld/tap/revise';

const pipeline = [
  {
    title: 'Group characters into lines',
    body: 'If two characters have baselines within a quarter of an em of each other, they’re on the same line. A gap bigger than 0.15 em means a new word, and anything over 1.2 em splits the line into separate pieces.',
  },
  {
    title: 'Figure out if it’s columns or a table',
    body: 'It scans down the page looking for strips of empty space. If most of the lines line up row by row across those gaps, it’s a table. If each side has its own flow of text, it’s columns.',
  },
  {
    title: 'Join lines into paragraphs',
    body: 'A line only gets added to the paragraph above it if its first word wouldn’t have fit at the end of the line before. If it would have fit, that line break was probably on purpose. The size, weight, indent, and line spacing must match too.',
  },
  {
    title: 'Find lists and headings',
    body: 'Bullets and numbers like 1., (3), or iv. turn into list items. Short lines that are bigger than the body text turn into headings, ranked by size.',
  },
];

const stack = [
  { label: 'Language', value: 'Rust' },
  { label: 'Reading PDFs', value: 'PDFium' },
  { label: 'Text layout', value: 'Parley' },
  { label: 'Interface', value: 'egui on wgpu' },
  { label: 'Writing PDFs', value: 'krilla' },
];

export function Revise() {
  return (
    <>
      <section className="column prose">
        <p className="post-lede">
          Editing a PDF is a pain. Under the hood a PDF is mostly a list of
          characters and where to draw each one on the page. It doesn’t know
          what a paragraph or a table is. So editing one usually means
          converting it to something else and hoping the layout survives.
        </p>
        <p>
          I got tired of the conversion process, so I built Revise, a native Mac
          app that lets you edit a PDF like a Google Doc. You open the file,
          click into the text, and start typing. Lines rewrap, lists keep their
          numbers, tables grow as you add to them, and <kbd>⌘S</kbd> saves it
          back to the same PDF.
        </p>
      </section>

      <figure className="post-figure" data-reveal>
        <img
          src="/blog/revise-editing.webp"
          alt="Revise editing a sample resume, with a word-processor style formatting toolbar above the page"
          width="1600"
          height="1224"
          loading="lazy"
        />
        <figcaption>
          Editing a sample resume. If you’ve used Google Docs or Word, the
          toolbar should look familiar.
        </figcaption>
      </figure>

      <section className="column prose" data-reveal>
        <h2 className="label">How it works</h2>
        <p>
          Since the PDF doesn’t have any structure, Revise has to figure it out
          from the layout when you open the file. It does that with rules based
          on the geometry and the fonts. There’s no AI or OCR involved, so the
          same PDF always comes out the same way. All of the thresholds are
          measured in ems of the font size, which is why the same rules work on
          9 pt body text and a 24 pt name at the top of a resume.
        </p>
        <p>Roughly, it goes like this:</p>
        <ol className="pipeline">
          {pipeline.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              {step.body}
            </li>
          ))}
        </ol>
        <p>
          Resumes needed some special handling. A row like{' '}
          <code>Company {'->'} 2024 – Present</code> looks like a table, but it
          isn’t. Revise turns it into one paragraph with a right-aligned tab
          stop, so you can edit the left side and the date stays on the right
          edge.
        </p>
      </section>

      <section className="column prose" data-reveal>
        <h2 className="label">Saving</h2>
        <p>
          Once the file is open, Revise stops reading from the original PDF.
          Your edits change its own document model, and the layout, what you see
          on screen, and the export all come from that. When you save, it writes
          a brand new PDF with the fonts embedded and real vector text, so it
          still opens fine in Preview, Acrobat, or a browser. If you open that
          file in Revise again, the tables, lists, and styles come back exactly
          how you left them.
        </p>
        <p>
          It also tries hard not to lose your work. The first time you save over
          a PDF it keeps a copy of the original, unsaved edits get autosaved
          every 15 seconds in case it crashes, and it asks before throwing
          anything away.
        </p>
      </section>

      <section className="column prose" data-reveal>
        <h2 className="label">Built with</h2>
        <dl className="details">
          {stack.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="column prose" data-reveal>
        <h2 className="label">What it’s good at</h2>
        <p>
          It works best on normal text documents like resumes, letters, reports,
          forms, and simple multi-column layouts. It reads the text that’s
          already in the PDF, so scanned pages can’t be edited, and really
          design-heavy files like magazines or posters might not come out
          perfect.
        </p>
      </section>

      <section className="column prose" data-reveal>
        <h2 className="label">Try it</h2>
        <p>
          It’s free and open source. You’ll need an Apple Silicon Mac on macOS
          12 or newer. You can download it from the website or install it with
          Homebrew:
        </p>
        <div className="code-block">
          <pre>
            <code>{brewCommand}</code>
          </pre>
          <CopyButton text={brewCommand} label="Copy command" />
        </div>
        <p className="post-links">
          <a className="chip" href="https://revise.timmarkfeld.com/">
            revise.timmarkfeld.com <ArrowUpRight size={12} aria-hidden="true" />
          </a>
          <a
            className="chip"
            href="https://github.com/tcmarkfeld/revise-pdf"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </p>
      </section>

      <section className="column prose" data-reveal>
        <h2 className="label">The whole thing, as a machine</h2>
        <p>
          If it helps to picture it: a PDF is like a page of metal type where
          every letter got glued down wherever it landed, and Revise does the
          typesetting in reverse.
        </p>
      </section>
      <div className="post-figure revise-bench-wrap">
        <Suspense fallback={<div className="revise-bench-placeholder" />}>
          <ReviseBench />
        </Suspense>
      </div>
    </>
  );
}
