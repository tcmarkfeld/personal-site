import { useNavigate } from '@tanstack/react-router';
import {
  ArrowRight,
  CloudLightning,
  Copy,
  FileText,
  Github,
  Linkedin,
  Moon,
  Search,
  Sun,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ROUTES } from '@/Navigation/routeEnum';
import { posts } from '@/pages/Blog/posts';
import { setSiteState, useSiteState } from '@/lib/siteState';
import { setDarkTheme, useDarkTheme } from '@/lib/theme';

type Command = {
  group: string;
  label: string;
  Icon: LucideIcon;
  run: () => void | Promise<unknown>;
};

const email = 'mail@timmarkfeld.com';

export function CommandMenu() {
  const navigate = useNavigate();
  const dark = useDarkTheme();
  const { menu, sky, sound } = useSiteState();
  const storm = sky === 'storm';
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSiteState({ menu: !menu });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menu && !dialog.open) {
      setQuery('');
      setActive(0);
      setNotice('');
      dialog.showModal();
    }
    if (!menu && dialog.open) dialog.close();
  }, [menu]);

  const commands = useMemo<Command[]>(() => {
    const go = (hash: string) => () => navigate({ to: ROUTES.HOME, hash });
    const open = (url: string) => () => window.open(url, '_blank', 'noopener');
    return [
      {
        group: 'Go to',
        label: 'Hello',
        Icon: ArrowRight,
        run: go('hello'),
      },
      {
        group: 'Go to',
        label: 'Experience',
        Icon: ArrowRight,
        run: go('experience'),
      },
      {
        group: 'Go to',
        label: 'Things I’ve made',
        Icon: ArrowRight,
        run: go('work'),
      },
      {
        group: 'Go to',
        label: 'Blog',
        Icon: ArrowRight,
        run: () => navigate({ to: ROUTES.BLOG }),
      },
      {
        group: 'Go to',
        label: 'Contact',
        Icon: ArrowRight,
        run: go('contact'),
      },
      ...posts.map((post) => ({
        group: 'Read',
        label: post.title,
        Icon: ArrowRight,
        run: () => navigate({ to: '/blog/$slug', params: { slug: post.slug } }),
      })),
      {
        group: 'Do',
        label: 'Copy email address',
        Icon: Copy,
        run: () => navigator.clipboard.writeText(email),
      },
      {
        group: 'Do',
        label: 'Download résumé',
        Icon: FileText,
        run: open('/Timothy_Markfeld_Resume.pdf'),
      },
      {
        group: 'Do',
        label: dark ? 'Switch to light mode' : 'Switch to dark mode',
        Icon: dark ? Sun : Moon,
        run: () => setDarkTheme(!dark),
      },
      {
        group: 'Do',
        label: sound ? 'Mute ambient waves' : 'Play ambient waves',
        Icon: sound ? VolumeX : Volume2,
        run: () => setSiteState({ sound: !sound }),
      },
      {
        group: 'Do',
        label: storm ? 'Calm the storm' : 'Summon a storm',
        Icon: CloudLightning,
        run: () => {
          setSiteState({ sky: storm ? 'live' : 'storm' });
          if (!storm) navigate({ to: ROUTES.HOME, hash: 'top' });
        },
      },
      {
        group: 'Elsewhere',
        label: 'GitHub',
        Icon: Github,
        run: open('https://github.com/tcmarkfeld'),
      },
      {
        group: 'Elsewhere',
        label: 'LinkedIn',
        Icon: Linkedin,
        run: open('https://linkedin.com/in/timothy-markfeld'),
      },
    ];
  }, [dark, navigate, sound, storm]);

  const results = commands.filter(({ label, group }) =>
    `${group} ${label}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function execute(command: Command | undefined) {
    if (!command) return;
    const result = command.run();
    if (command.label === 'Copy email address') {
      result
        ?.then(() => setNotice(`Copied ${email}`))
        .catch(() => setNotice('Couldn’t copy. Your browser blocked it.'));
      return;
    }
    setSiteState({ menu: false });
  }

  return (
    <>
      <dialog
        className="command-menu"
        ref={dialogRef}
        aria-label="Command menu"
        onClose={() => setSiteState({ menu: false })}
        onClick={(event) => {
          if (event.target === event.currentTarget)
            setSiteState({ menu: false });
        }}
      >
        <div className="command-search">
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((active + 1) % Math.max(results.length, 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive(
                  (active - 1 + results.length) % Math.max(results.length, 1),
                );
              }
              if (event.key === 'Enter') execute(results[active]);
            }}
            placeholder="Type a command or search…"
            aria-label="Search commands"
            aria-controls="command-results"
            aria-activedescendant={
              results[active] ? `command-${active}` : undefined
            }
            role="combobox"
            aria-expanded="true"
            autoFocus
          />
          <kbd>esc</kbd>
        </div>
        <ul id="command-results" role="listbox">
          {results.map((command, index) => (
            <Fragment key={command.label}>
              {(index === 0 || results[index - 1].group !== command.group) && (
                <li className="command-group" role="presentation">
                  {command.group}
                </li>
              )}
              <li
                id={`command-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseMove={() => setActive(index)}
                onClick={() => execute(command)}
              >
                <command.Icon size={15} aria-hidden="true" />
                {command.label}
              </li>
            </Fragment>
          ))}
          {!results.length && (
            <li className="command-empty">
              Nothing matches that. Try “storm”.
            </li>
          )}
        </ul>
        <p className="command-notice" aria-live="polite">
          {notice}
        </p>
      </dialog>
    </>
  );
}
