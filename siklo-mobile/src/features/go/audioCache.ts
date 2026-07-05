/**
 * Audio caching for offline taxi use (P4 plan §5 item 4). TTS clips are
 * cached to expo-file-system keyed by a hash of `${lang}:${text}` so the
 * same destination + note replays instantly, and works with the phone
 * screen shown to a driver with no signal.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { ttsUrl } from '../../services/api';
import type { GoLang } from './GoHome';

const CACHE_DIR_NAME = 'go-audio-cache';

/** djb2 string hash — tiny, deterministic, good enough for a cache key. */
export function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 + charCode, kept in 32-bit range.
    hash = (hash * 33 + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function cacheDir(): Directory {
  const dir = new Directory(Paths.cache, CACHE_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export function cacheKey(text: string, lang: GoLang): string {
  return `${lang}-${djb2(text)}.mp3`;
}

export function getCachedFile(text: string, lang: GoLang): File {
  return new File(cacheDir(), cacheKey(text, lang));
}

export interface PlaybackSource {
  uri: string;
  /** True if this URI is already a local cached file (works fully offline). */
  cached: boolean;
}

/**
 * Resolves where to play `text` (in `lang`) from: the cached local file if
 * present, otherwise the streaming TTS URL. When streaming, also kicks off
 * a best-effort background download into the cache for next time (e.g. so
 * the same card works offline in the taxi on a repeat visit).
 */
export function resolvePlaybackSource(text: string, lang: GoLang): PlaybackSource {
  const file = getCachedFile(text, lang);
  if (file.exists) {
    return { uri: file.uri, cached: true };
  }

  const remote = ttsUrl(text, lang);

  // Fire-and-forget: playback already proceeds from `remote`, so a failed
  // background download just means we try again next time.
  File.downloadFileAsync(remote, file, { idempotent: true }).catch(() => {
    // Network hiccup or offline — nothing to do, streaming path already
    // handles (or fails) playback independently.
  });

  return { uri: remote, cached: false };
}
