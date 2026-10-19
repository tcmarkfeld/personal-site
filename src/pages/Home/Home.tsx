import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  HeartIcon,
  PalmIcon,
  NodesIcon,
  TruckIcon,
} from '@/components/BioIcons';
import { ActivityGraph } from '@/components/ActivityGraph';
import { PostList } from '@/pages/Blog/BlogIndex';
import { CoastalScene } from '@/components/CoastalScene';
import { Gallery } from '@/components/Gallery';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ROUTES } from '@/Navigation/routeEnum';
import { useSiteState } from '@/lib/siteState';
import { useDarkTheme } from '@/lib/theme';
import { useReveal } from '@/lib/useReveal';
import { useStPeteWeather } from '@/lib/useStPeteWeather';
import { playSound } from '@/lib/uiSounds';
import './Home.css';

const experience = [
  {
    company: 'FirmPilot',
    logo: '/firmpilot_logo.webp',
    role: 'Senior Software Engineer',
    date: '2025 — now',
    description:
      'Building AI-powered marketing platforms: distributed AWS workers, secure GraphQL APIs, and automated content pipelines serving hundreds of client sites.',
    detail:
      'Owned fault-tolerant SQS/SNS worker systems, React and Next.js applications, and multi-tenant APIs with p99 query latency below 25ms. Mentored engineers and supported production incident response.',
    metric: '<25ms p99 query latency',
    href: 'https://firmpilot.com/',
  },
  {
    company: 'HCA Healthcare',
    logo: '/hca_logo.webp',
    role: 'Data Integration Engineer II',
    date: '2023 — 2025',
    description:
      'Connected clinical systems at scale. Supported 200+ HIPAA-regulated microservices processing more than one million events each day.',
    detail:
      'Integrated EHR systems through FHIR, HL7, and IHE standards. Led migration to Apache NiFi with Terraform and Google Cloud, with monitoring and automated failover workflows.',
    metric: '1M+ events per day',
    href: 'https://www.hcahealthcare.com/',
  },
  {
    company: 'Corolla Ice Delivery',
    logo: '/corolla_ice_delivery_logo.webp',
    role: 'Full Stack Engineer',
    date: '2020 — 2023',
    description:
      'Owned a React Native delivery app from design through App Store and Google Play that cut daily delivery time by up to 3 hours.',
    detail:
      'Replaced manual scheduling with route optimization used in day-to-day operations during peak season. Built the supporting React site and Node/MySQL backend so drivers and ops ran on one stack end to end.',
    metric: 'Up to 3 hrs saved a day',
    href: 'https://corollaicedelivery.com/',
    post: ROUTES.COROLLA,
  },
];

const details = [
  { label: 'Building', value: 'AI marketing systems at FirmPilot' },
  { label: 'Studied', value: 'Master’s & B.S., MIS, University of Alabama' },
  { label: 'Reach for', value: 'C#/.NET, TypeScript, React, AWS, Terraform' },
];
const stPeteTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  minute: '2-digit',
});

// A soft spring: a slight overshoot, then settles.
const SPRING =
  'linear(0, 0.06 3%, 0.22 7%, 0.45 12%, 0.68 18%, 0.85 25%, 0.95 32%, 1.01 40%, 1.025 48%, 1.02 58%, 1.005 72%, 1)';
const jobMotion = new WeakMap<HTMLDetailsElement, Animation[]>();

// Opens a job card on a spring with its content arriving in turn, and closes it
// with the content lifting away before the card folds shut.
function toggleJob(event: MouseEvent<HTMLElement>) {
  const summary = event.currentTarget;
  const job = summary.parentElement as HTMLDetailsElement;
  playSound(!job.open || 'closing' in job.dataset ? 'open' : 'close');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  event.preventDefault();
  const body = job.querySelector<HTMLElement>('.job-body')!;
  const logo = job.querySelector<HTMLElement>('.job-logo')!;
  const from = job.offsetHeight;
  jobMotion.get(job)?.forEach((animation) => animation.cancel());
  job.dataset.animating = '';

  if (!job.open || 'closing' in job.dataset) {
    delete job.dataset.closing;
    job.open = true;
    const grow = job.animate(
      { height: [`${from}px`, `${job.offsetHeight}px`] },
      { duration: 620, easing: SPRING },
    );
    grow.onfinish = () => delete job.dataset.animating;
    const items = [
      ...body.querySelectorAll<HTMLElement>(':scope > p, .job-foot > *'),
    ];
    jobMotion.set(job, [
      grow,
      ...items.map((item, i) =>
        item.animate(
          [
            { opacity: 0, transform: 'translateY(10px)', filter: 'blur(6px)' },
            { opacity: 1, transform: 'none', filter: 'blur(0)' },
          ],
          {
            duration: 560,
            delay: 90 + i * 60,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill: 'backwards',
          },
        ),
      ),
      logo.animate(
        [
          { transform: 'none' },
          { transform: 'rotate(-9deg) scale(1.1)', offset: 0.3 },
          { transform: 'rotate(4deg) scale(1.04)', offset: 0.6 },
          { transform: 'none' },
        ],
        { duration: 700, easing: 'ease-out' },
      ),
    ]);
    return;
  }

  job.dataset.closing = '';
  const shrink = job.animate(
    { height: [`${from}px`, `${summary.offsetHeight}px`] },
    { duration: 440, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  );
  shrink.onfinish = () => {
    job.open = false;
    delete job.dataset.closing;
    delete job.dataset.animating;
    jobMotion.get(job)?.forEach((animation) => animation.cancel());
  };
  jobMotion.set(job, [
    shrink,
    body.animate(
      [
        { opacity: 1, transform: 'none', filter: 'blur(0)' },
        {
          opacity: 0,
          transform: 'translateY(-8px) scale(0.98)',
          filter: 'blur(4px)',
        },
      ],
      { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
    ),
    logo.animate(
      [
        { transform: 'none' },
        { transform: 'scale(0.9)' },
        { transform: 'none' },
      ],
      { duration: 420, easing: 'ease-in-out' },
    ),
  ]);
}

const SCRAMBLE = 'abcdefghijklmnopqrstuvwxyz0123456789°';
const scramble = (length: number) =>
  Array.from(
    { length },
    () => SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)],
  ).join('');
const PLACEHOLDER = '·'.repeat(16);

// The caption's weather, in a fixed-width slot so the line never re-centres.
// While the forecast loads the slot scrambles; when it lands, the text
// decodes into place left to right.
function WeatherReadout({ text }: { text: string | undefined }) {
  const [shown, setShown] = useState(text ?? PLACEHOLDER);
  // Text that's already known on arrival (cached weather, a sky override)
  // simply shows; only text that changes while you're here decodes in.
  const arrived = useRef(text);

  useEffect(() => {
    if (text !== undefined && text === arrived.current) return;
    arrived.current = undefined;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const timer = window.setInterval(() => {
      if (text === undefined) {
        setShown(still ? PLACEHOLDER : scramble(PLACEHOLDER.length));
        return;
      }
      const resolved = still
        ? text.length
        : Math.floor((performance.now() - start) / 32);
      setShown(
        text.slice(0, resolved) + scramble(Math.max(0, text.length - resolved)),
      );
      if (resolved >= text.length) window.clearInterval(timer);
    }, 55);
    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <span className="weather-readout" data-loading={text === undefined}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{text ?? 'Loading the weather'}</span>
    </span>
  );
}

function Token({
  children,
  Icon,
  tone,
  order,
}: {
  children: string;
  Icon: () => ReactNode;
  tone: string;
  order: number;
}) {
  return (
    <span
      className="token"
      style={{ '--tone': tone, '--order': order } as CSSProperties}
    >
      {children}
      <Icon />
    </span>
  );
}

export const Home = () => {
  const pageRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLElement>(null);
  const dark = useDarkTheme();
  const { sky } = useSiteState();
  const weather = useStPeteWeather();
  const [localTime, setLocalTime] = useState(() =>
    stPeteTime.format(new Date()),
  );
  const effect = sky === 'live' ? (weather?.effect ?? 'clear') : sky;
  useReveal(pageRef);

  // Light up the bio's keywords the first time it scrolls into view.
  useEffect(() => {
    const bio = bioRef.current;
    if (!bio) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        bio.dataset.lit = 'true';
        observer.disconnect();
      },
      // Wait until the bio has scrolled up past the lower third of the screen.
      { threshold: 0.5, rootMargin: '0px 0px -35% 0px' },
    );
    observer.observe(bio);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(
      () => setLocalTime(stPeteTime.format(new Date())),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="site"
      data-theme={dark ? 'dark' : 'light'}
      id="top"
      ref={pageRef}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <div className="edge-fade" aria-hidden="true" />
      <main id="main">
        <section className="hero" aria-label="St. Petersburg, Florida">
          <div className="scene-frame">
            <CoastalScene
              dark={dark}
              effect={effect}
              weather={weather}
              pending={sky === 'live' && weather === undefined}
            />
          </div>
          <p className="scene-caption">
            St. Petersburg, FL · <time>{localTime}</time> ·{' '}
            <WeatherReadout
              text={
                sky !== 'live'
                  ? `sky set to ${sky}`
                  : weather === undefined
                    ? undefined
                    : weather
                      ? `${weather.temperature}°F, ${weather.label}`
                      : 'weather offline'
              }
            />
          </p>
        </section>

        <section className="column bio" id="hello" ref={bioRef}>
          <h1 className="sr-only">
            Timothy Markfeld, senior software engineer
          </h1>
          <p>
            I’m <span className="bio-name">Tim</span>, a software engineer in{' '}
            <Token Icon={PalmIcon} order={0} tone="#1f9d6b">
              St. Pete
            </Token>
          </p>
          <p>
            I started out building a{' '}
            <Token Icon={TruckIcon} order={1} tone="#d98a1c">
              delivery app
            </Token>{' '}
            for an ice company on the Outer Banks, then spent a couple of years
            at HCA moving{' '}
            <Token Icon={HeartIcon} order={2} tone="#e0445a">
              patient records
            </Token>{' '}
            between their hospitals and outside health systems. Now I work on{' '}
            <Token Icon={NodesIcon} order={3} tone="#8a4fff">
              AI
            </Token>{' '}
            at{' '}
            <a
              className="token token-logo"
              href="https://firmpilot.com/"
              target="_blank"
              rel="noreferrer"
            >
              <img src="/firmpilot_logo.webp" alt="" width="16" height="16" />
              FirmPilot
            </a>
          </p>
          <p>
            On the side I make tools I want to exist, like{' '}
            <a
              className="token token-logo"
              href="https://revise.timmarkfeld.com/"
              target="_blank"
              rel="noreferrer"
            >
              <img src="/revise/icon.png" alt="" width="16" height="16" />
              Revise
            </a>
          </p>
        </section>
        <section className="column" id="experience" data-reveal>
          <h2 className="label">Experience</h2>
          <div className="jobs">
            {experience.map((job) => (
              <details className="job" key={job.company}>
                <summary onClick={toggleJob}>
                  <img
                    className="job-logo"
                    src={job.logo}
                    alt=""
                    width="32"
                    height="32"
                    loading="lazy"
                  />
                  <span className="job-title">
                    <strong>{job.company}</strong>
                    <span>{job.role}</span>
                  </span>
                  <time>{job.date}</time>
                  <Plus className="job-toggle" size={14} aria-hidden="true" />
                </summary>
                <div className="job-body">
                  <p>{job.description}</p>
                  <p>{job.detail}</p>
                  <div className="job-foot">
                    <span className="chip chip-quiet">{job.metric}</span>
                    {job.post && (
                      <Link to={job.post} viewTransition>
                        Read the post{' '}
                        <ArrowRight size={12} aria-hidden="true" />
                      </Link>
                    )}
                    <a href={job.href} target="_blank" rel="noreferrer">
                      Website <ArrowUpRight size={12} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="work" id="work">
          <div className="column" data-reveal>
            <h2 className="label">Things I’ve made</h2>
            <p className="work-intro">
              Open-source tools I’ve built, and the delivery app I wrote about.
            </p>
          </div>
          <Gallery />
        </section>

        <section className="column writing" data-reveal>
          <h2 className="label">Writing</h2>
          <PostList />
          <Link className="writing-all" to={ROUTES.BLOG} viewTransition>
            All posts <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </section>

        <ActivityGraph user="tcmarkfeld" />

        <section className="column currently" data-reveal>
          <h2 className="label">Currently</h2>
          <dl className="details">
            {details.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};
