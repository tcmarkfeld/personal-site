import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { lazy, Suspense, type ReactNode } from 'react';
import { PhoneShot } from '@/components/PhoneShot';
import { ShaderBackdrop } from '@/components/ShaderBackdrop';
import { useDarkTheme } from '@/lib/theme';
import { ROUTES } from '@/Navigation/routeEnum';

// The figures carry large generated drawings, so they load after the page.
const ReviseFigure = lazy(() =>
  import('@/components/projectFigures/ReviseFigure').then((m) => ({
    default: m.ReviseFigure,
  })),
);
const Hl7KitFigure = lazy(() =>
  import('@/components/projectFigures/Hl7KitFigure').then((m) => ({
    default: m.Hl7KitFigure,
  })),
);
const ConductorFigure = lazy(() =>
  import('@/components/projectFigures/ConductorFigure').then((m) => ({
    default: m.ConductorFigure,
  })),
);

// One palette for every panel, from the site itself: the sky-blue accent, a
// pale blue-grey, and the ivory of the favicon. Dark mode gets its own cool
// palette, since darkening the ivory turns it a muddy yellow.
const PANEL_COLORS = {
  light: ['#7fb9e6', '#d7e6f1', '#f3ede4'],
  dark: ['#2f5677', '#18212b', '#2a3542'],
} as const;
// Starting points in the flow, picked so the panels look alike.
const PANEL_STARTS = [12, 88, 50, 69];

type Project = {
  title: string;
  about: string;
  caption: string;
  alt: string;
  year: string;
  stack: string;
  stage: ReactNode;
  href?: string;
  to?: string;
  linkLabel: string;
  packages?: string[];
};

const projects: Project[] = [
  {
    title: 'Revise',
    about: 'A native macOS app that edits PDFs like a doc, no conversions.',
    caption: 'A PDF opened, edited in place, and saved back out.',
    alt: 'Illustration of a typewriter carriage typing a word into a printed page while the rest of the line re-wraps.',
    year: '2026',
    stack: 'Rust, egui, PDFium',
    href: 'https://revise.timmarkfeld.com/',
    linkLabel: 'revise.timmarkfeld.com',
    stage: <ReviseFigure />,
  },
  {
    title: 'HL7Kit',
    about: 'Strongly typed HL7 parsing and FHIR conversion for .NET.',
    caption: 'An HL7 message mapped to a FHIR resource.',
    alt: 'Illustration of a tape slitter cutting an HL7 message at each field delimiter and sorting the fields into bins.',
    year: '2026',
    stack: 'C#, .NET',
    href: 'https://github.com/tcmarkfeld/HL7Kit',
    linkLabel: 'GitHub',
    packages: ['HL7Kit', 'HL7Kit.Fhir'],
    stage: <Hl7KitFigure />,
  },
  {
    title: 'Conductor',
    about: 'Least-privilege IAM and Terraform from messaging config.',
    caption: 'An app’s SQS queues and SNS topics, and the IAM it needs.',
    alt: 'Illustration of a key-duplicating machine copying the cuts of a template key onto a blank.',
    year: '2026',
    stack: 'C#, Terraform',
    href: 'https://github.com/tcmarkfeld/Conductor',
    linkLabel: 'GitHub',
    packages: ['Conductor.Tool'],
    stage: <ConductorFigure />,
  },
  {
    title: 'Corolla Ice Delivery',
    about:
      'The delivery app I shipped to both stores, and how its routing works.',
    caption: 'The driver’s route for the day.',
    alt: 'Screenshot of the Corolla Ice Delivery driver app showing the route for the day.',
    year: '2020 — 2023',
    stack: 'React Native, Node, MySQL',
    to: ROUTES.COROLLA,
    linkLabel: 'Read the post',
    stage: <PhoneShot />,
  },
];

export function Gallery() {
  const dark = useDarkTheme();
  return (
    <div className="projects">
      {projects.map((project, index) => (
        <article className="project" key={project.title} data-reveal>
          <figure className="project-panel">
            <div className="project-stage" role="img" aria-label={project.alt}>
              <ShaderBackdrop
                colors={PANEL_COLORS[dark ? 'dark' : 'light']}
                start={PANEL_STARTS[index]}
              />
              <Suspense>{project.stage}</Suspense>
            </div>
            <figcaption>{project.caption}</figcaption>
          </figure>
          <div className="project-info">
            <h3>{project.title}</h3>
            <p>{project.about}</p>
            <dl>
              <div>
                <dt>Year</dt>
                <dd>{project.year}</dd>
              </div>
              <div>
                <dt>Built with</dt>
                <dd>{project.stack}</dd>
              </div>
              <div>
                <dt>Link</dt>
                <dd>
                  {project.href ? (
                    <a href={project.href} target="_blank" rel="noreferrer">
                      {project.linkLabel}{' '}
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </a>
                  ) : (
                    project.to && (
                      <Link to={project.to} viewTransition>
                        {project.linkLabel}{' '}
                        <ArrowRight size={12} aria-hidden="true" />
                      </Link>
                    )
                  )}
                </dd>
              </div>
              {project.packages && (
                <div>
                  <dt>NuGet</dt>
                  <dd>
                    {project.packages.map((name) => (
                      <a
                        key={name}
                        href={`https://www.nuget.org/packages/${name}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {name} <ArrowUpRight size={12} aria-hidden="true" />
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </article>
      ))}
    </div>
  );
}
