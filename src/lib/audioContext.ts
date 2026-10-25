// On iPhone, web audio follows the ringer switch unless the page declares its
// sound as playback, the way a video's is. Declaring it lets the site's sounds
// play with the ringer off. Safari 16.4+ only; elsewhere this does nothing.
type WithAudioSession = Navigator & { audioSession?: { type: string } };

export function createAudioContext() {
  const session = (navigator as WithAudioSession).audioSession;
  if (session) session.type = 'playback';
  return new AudioContext();
}
