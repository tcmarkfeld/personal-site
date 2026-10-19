import type { ReactNode } from 'react';

// Two-tone icons for the bio. Named parts animate once the section is lit.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="bio-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function PalmIcon() {
  return (
    <Icon>
      <path d="M12 22c0-4 .4-7.3 1.5-11" />
      <g className="palm-fronds">
        <path
          className="duo"
          d="M13.5 11C11 7.5 7 7 4 8.5c3-.2 6 .8 9.5 2.5Z"
        />
        <path
          className="duo"
          d="M13.5 11c1-3.5 4.5-6 8.5-5.5-3 .8-5.8 2.8-8.5 5.5Z"
        />
        <path
          className="duo"
          d="M13.5 11c-1-3 0-6.5 2.5-8.5-.8 2.8-1.5 5.5-2.5 8.5Z"
        />
        <path
          className="duo"
          d="M13.5 11c-3 .3-6.5 2.5-7.5 6 2.2-2.5 4.8-4.4 7.5-6Z"
        />
        <path className="duo" d="M13.5 11c3 0 6 2 7 5.5-2-2.3-4.5-4.2-7-5.5Z" />
      </g>
    </Icon>
  );
}

export function HeartIcon() {
  return (
    <Icon>
      <path
        className="duo heart-shape"
        d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"
      />
      <path className="heart-pulse" d="M7 12.5h2.5l1.2-2.5 2.2 5 1.3-2.5H17" />
    </Icon>
  );
}

export function TruckIcon() {
  return (
    <Icon>
      <g className="truck-body">
        <rect className="duo" x="2" y="6" width="11.5" height="9.5" rx="1.5" />
        <path className="duo" d="M13.5 9.5h4l3 3.5v2.5h-7Z" />
      </g>
      <circle className="truck-wheel" cx="6.5" cy="17.5" r="2" />
      <circle className="truck-wheel" cx="16.5" cy="17.5" r="2" />
    </Icon>
  );
}

// Three nodes of a network; a pulse travels the links once the bio is lit.
export function NodesIcon() {
  return (
    <Icon>
      <path d="M8.6 6.5h6.8M7.25 8.78l3.5 6.44M16.75 8.78l-3.5 6.44" />
      <path className="nodes-pulse" d="M6 6.5h12l-6 11Z" pathLength="30" />
      <circle className="duo" cx="6" cy="6.5" r="2.6" />
      <circle className="duo" cx="18" cy="6.5" r="2.6" />
      <circle className="duo" cx="12" cy="17.5" r="2.6" />
    </Icon>
  );
}
