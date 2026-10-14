import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { PhoneShot } from '@/components/PhoneShot';
import { ProjectDiagram } from '@/components/ProjectDiagram';
import { ShaderBackdrop } from '@/components/ShaderBackdrop';
import { useDarkTheme } from '@/lib/theme';
import { ROUTES } from '@/Navigation/routeEnum';

type Project = {
  title: string;
  about: string;
  caption: string;
  year: string;
  stack: string;
  colors: readonly [string, string, string];
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
    year: '2026',
    stack: 'Rust, egui, PDFium',
    colors: ['#2f6bff', '#9cc8ff', '#f4d9c6'],
    href: 'https://revise.timmarkfeld.com/',
    linkLabel: 'revise.timmarkfeld.com',
    stage: (
      <div className="device">
        <ProjectDiagram kind="revise" />
      </div>
    ),
  },
  {
    title: 'HL7Kit',
    about: 'Strongly typed HL7 parsing and FHIR conversion for .NET.',
    caption: 'An HL7 message mapped to a FHIR resource.',
    year: '2026',
    stack: 'C#, .NET',
    colors: ['#e0445a', '#f6a6b2', '#b9a4f5'],
    href: 'https://github.com/tcmarkfeld/HL7Kit',
    linkLabel: 'GitHub',
    packages: ['HL7Kit', 'HL7Kit.Fhir'],
    stage: (
      <div className="device">
        <ProjectDiagram kind="parser" />
      </div>
    ),
  },
  {
    title: 'Conductor',
    about: 'Least-privilege IAM and Terraform from messaging config.',
    caption: 'An app’s SQS queues and SNS topics, and the IAM it needs.',
    year: '2026',
    stack: 'C#, Terraform',
    colors: ['#dd704b', '#f6c177', '#7fc4c0'],
    href: 'https://github.com/tcmarkfeld/Conductor',
    linkLabel: 'GitHub',
    packages: ['Conductor.Tool'],
    stage: (
      <div className="device">
        <ProjectDiagram kind="conductor" />
      </div>
    ),
  },
  {
    title: 'Corolla Ice Delivery',
    about:
      'The delivery app I shipped to both stores, and how its routing works.',
    caption: 'The driver’s route for the day.',
    year: '2020 — 2023',
    stack: 'React Native, Node, MySQL',
    colors: ['#1f9d9b', '#9ee0dc', '#f3d9a4'],
    to: ROUTES.COROLLA,
    linkLabel: 'Read the post',
    stage: <PhoneShot />,
  },
];

export function Gallery() {
  const dark = useDarkTheme();
  return (
    <div className="projects">
      {projects.map((project) => (
        <article className="project" key={project.title} data-reveal>
          <figure className="project-panel">
            <div className="project-stage">
              <ShaderBackdrop colors={project.colors} dim={dark} />
              {project.stage}
            </div>
            <figcaption>{project.caption}</figcaption>
          </figure>
          <div className="project-info">
            <h3>{project.title}</h3>
            <dl>
              <div className="project-about">
                <dt>About</dt>
                <dd>{project.about}</dd>
              </div>
              <div>
                <dt>Year</dt>
                <dd>{project.year}</dd>
              </div>
              <div>
                <dt>Built with</dt>
                <dd>{project.stack}</dd>
              </div>
              <div className="project-about">
                <dt>{project.to ? 'Read' : 'View'}</dt>
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
                <div className="project-about">
                  <dt>NuGet</dt>
                  {project.packages.map((name) => (
                    <dd key={name}>
                      <a
                        href={`https://www.nuget.org/packages/${name}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {name} <ArrowUpRight size={12} aria-hidden="true" />
                      </a>
                    </dd>
                  ))}
                </div>
              )}
            </dl>
          </div>
        </article>
      ))}
    </div>
  );
}
