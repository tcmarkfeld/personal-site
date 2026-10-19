import { ArrowUpRight } from 'lucide-react';
import { useDarkTheme } from '@/lib/theme';

const facts = [
  { label: 'Role', value: 'Full Stack Engineer' },
  { label: 'When', value: 'May 2020 — Aug 2023' },
  { label: 'Stack', value: 'React Native, React, Node.js, MySQL' },
  { label: 'Shipped to', value: 'App Store and Google Play' },
  { label: 'Result', value: 'Up to 3 hours cut from a delivery day' },
];

const screens = [
  {
    src: '/ice-delivery-route.webp',
    title: 'Today’s route',
    caption:
      'Stops grouped by neighborhood, with drop-offs, refills, and pickups, the day’s bag count, and one-tap navigate, call, and text.',
  },
  {
    src: '/ice-delivery-route-progress.webp',
    title: 'Checking off stops',
    caption:
      'Marking a stop done updates the day’s progress and moves it to the Done tab.',
  },
  {
    src: '/ice-delivery-new-delivery.webp',
    title: 'New delivery',
    caption:
      'Bookings capture the customer, the rental address and neighborhood, and the rental dates.',
  },
  {
    src: '/ice-delivery-deliveries.webp',
    title: 'Deliveries',
    caption:
      'Every booking on record, searchable, with a week view and statuses like Active and Pickup today.',
  },
];

const story = [
  {
    label: 'The problem',
    paragraphs: [
      'Before the app, scheduling was all done by hand. During peak season someone had to sort through every delivery for the day and plan out the route before the driver could head out.',
    ],
  },
  {
    label: 'Planning the routes',
    paragraphs: [
      'A lot of the routing decisions came down to left turns. There are no traffic lights in and out of the neighborhoods, so with traffic, a left turn can take a really long time. I wanted the driver making as few of them as possible.',
      'So routes start at the neighborhood closest to the warehouse, and work their way south. Along the way the route makes sure the neighborhoods the driver is going into are on the right-hand side of the road, so they can turn right to get in and right to get back out instead of sitting there waiting for a gap. Any neighborhood that was on the left gets delivered to on their way back.',
    ],
  },
  {
    label: 'What I built',
    paragraphs: [
      'I built a React Native app for the drivers and the ops side and shipped it to the App Store and Google Play. The route optimization replaced the manual scheduling, and I built a React site with a Node and MySQL backend to go with it, so the drivers and ops were all on one stack.',
    ],
  },
  {
    label: 'How it went',
    paragraphs: [
      'It runs the day-to-day operations through peak season and cut up to three hours off each delivery day.',
    ],
  },
];

export function CorollaIceDelivery() {
  const dark = useDarkTheme();
  return (
    <>
      <section className="column post-lede">
        <p>
          Corolla Ice Delivery brings ice out to rental houses around Corolla,
          on the Outer Banks of North Carolina. I built their delivery app, from
          the design all the way through both app stores, plus the site and
          backend behind it.
        </p>
      </section>
      <div className="case-screens" data-reveal>
        {screens.map((screen) => (
          <figure key={screen.title}>
            <div className="phone-shot">
              <img
                // Each screen has a dark-mode twin named with a -dark suffix.
                src={
                  dark ? screen.src.replace('.webp', '-dark.webp') : screen.src
                }
                alt={`${screen.title} screen of the Corolla Ice Delivery app`}
                width="640"
                height="1392"
                loading="lazy"
              />
            </div>
            <figcaption>
              <strong>{screen.title}</strong>
              {screen.caption}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="case-note">Screens shown with sample data.</p>

      <section className="column" data-reveal>
        <h2 className="label">At a glance</h2>
        <dl className="details">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {story.map((part) => (
        <section
          className="column case-part prose"
          key={part.label}
          data-reveal
        >
          <h2 className="label">{part.label}</h2>
          {part.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}

      <section className="column post-links">
        <a
          className="chip"
          href="https://corollaicedelivery.com/"
          target="_blank"
          rel="noreferrer"
        >
          corollaicedelivery.com <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </section>
    </>
  );
}
