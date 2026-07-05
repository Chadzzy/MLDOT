/**
 * Recent destinations, persisted in AsyncStorage (P4 plan §5: "Recents
 * (last 5 destinations) in AsyncStorage, shown on GoHome as the prototype
 * does"). Stores full destination objects (not just an id) so ad-hoc
 * "Translate '…' as a destination" cards — which don't exist in
 * hk_poi.json — round-trip through recents just like curated POIs.
 *
 * Also persists the per-destination driver note (plan §5: "Persist per-
 * destination note in the recents entry"), keyed by name_en.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Poi } from './GoHome';

const STORAGE_KEY = '@siklo/go/recents';
const MAX_RECENTS = 5;

export interface RecentEntry extends Poi {
  visitedAt: number;
}

async function readAll(): Promise<RecentEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt storage should never crash the Go tab — treat as empty.
    return [];
  }
}

async function writeAll(entries: RecentEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function getRecents(): Promise<RecentEntry[]> {
  const all = await readAll();
  return all.sort((a, b) => b.visitedAt - a.visitedAt);
}

/**
 * Record (or bump) a destination as recently viewed. Keeps the last 5.
 * Pass the full current `Poi` (including any `note`/`noteYue`/`noteCmn`
 * fields) — the caller owns merging note edits, this just persists+dedupes.
 */
export async function addRecent(poi: Poi): Promise<RecentEntry[]> {
  const all = await readAll();
  const entry: RecentEntry = { ...poi, visitedAt: Date.now() };
  const rest = all.filter(r => r.name_en !== poi.name_en);
  const next = [entry, ...rest].slice(0, MAX_RECENTS);
  await writeAll(next);
  return next;
}
