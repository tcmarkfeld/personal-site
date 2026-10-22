// Renders scene.html to the looping link-preview video (og:video) and its
// first frame as the poster (og:image). Needs Google Chrome and ffmpeg.
// Run: node scripts/social-video/render.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, '../../public');
const FPS = 30;
const SECONDS = 8;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const frames = mkdtempSync(join(tmpdir(), 'social-video-'));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--use-angle=metal'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(pathToFileURL(join(HERE, 'scene.html')).href, {
    waitUntil: 'networkidle0',
  });
  await page.evaluate(() => document.fonts.ready);

  const count = FPS * SECONDS;
  for (let i = 0; i < count; i++) {
    await page.evaluate((t) => window.frame(t), i / count);
    const name = `${String(i).padStart(4, '0')}.png`;
    await page.screenshot({ path: join(frames, name) });
  }
} finally {
  await browser.close();
}

copyFileSync(join(frames, '0000.png'), join(PUBLIC, 'social-preview.png'));
// Plain H.264 in yuv420p so iMessage and other unfurlers can play it inline;
// faststart puts the index first so playback starts early.
execFileSync('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-framerate',
  String(FPS),
  '-i',
  join(frames, '%04d.png'),
  '-c:v',
  'libx264',
  '-preset',
  'veryslow',
  '-crf',
  '24',
  '-tune',
  'grain',
  '-pix_fmt',
  'yuv420p',
  '-profile:v',
  'high',
  '-movflags',
  '+faststart',
  '-an',
  join(PUBLIC, 'social-preview.mp4'),
]);
rmSync(frames, { recursive: true });
