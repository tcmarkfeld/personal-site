import { FileText, Github, Linkedin, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { menuShortcut, setSiteState } from '@/lib/siteState';

const clock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
});

const links = [
  { label: 'Email', href: 'mailto:mail@timmarkfeld.com', Icon: Mail },
  { label: 'GitHub', href: 'https://github.com/tcmarkfeld', Icon: Github },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/in/timothy-markfeld',
    Icon: Linkedin,
  },
  { label: 'Résumé', href: '/Timothy_Markfeld_Resume.pdf', Icon: FileText },
];

export function SiteFooter() {
  const [time, setTime] = useState(() => clock.format(new Date()));

  useEffect(() => {
    const timer = window.setInterval(
      () => setTime(clock.format(new Date())),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="site-footer" id="contact">
      <div className="column">
        <h2 className="label">Say hi</h2>
        <div className="footer-links">
          {links.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer"
              aria-label={label}
              data-tip={label}
            >
              <Icon size={17} />
            </a>
          ))}
        </div>
        <div className="footer-bar">
          <span className="signoff">see you out there</span>
          <span className="footer-tools">
            <button
              className="footer-shortcut"
              type="button"
              onClick={() => setSiteState({ menu: true })}
            >
              {menuShortcut}
            </button>
            <time aria-label="Local time in St. Petersburg">{time}</time>
          </span>
        </div>
      </div>
    </footer>
  );
}
