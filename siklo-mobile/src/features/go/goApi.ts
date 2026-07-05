/**
 * Go-specific helpers around the shared API client (src/services/api.ts is
 * Talk-owned and read-only from here — see file-ownership notes in the P4
 * task). Wraps the SSE translate stream into a plain Promise for the two
 * places Go needs one-shot translation:
 *   - free-text "Translate '…' as a destination" fallback (GoHome)
 *   - driver-note translation to both scripts (DestinationCard)
 */
import { translateStream, type Lang, type TranslateResult } from '../../services/api';

export class TranslateError extends Error {}

/**
 * Runs a translation over SSE and resolves with the final result once the
 * `done` event arrives (rejects on the in-band `error` event or a network
 * failure). Callers that want the live streamed tokens (never-blank staged
 * progress) can pass `onToken`.
 */
export function translateOnce(
  params: { text: string; source: Lang; target: Lang },
  onToken?: (partial: string) => void,
): Promise<TranslateResult> {
  return new Promise((resolve, reject) => {
    let partial = '';
    translateStream(params, {
      onToken: t => {
        partial += t;
        onToken?.(partial);
      },
      onDone: result => resolve(result),
      onError: detail => reject(new TranslateError(detail)),
    });
  });
}

export interface BilingualTranslation {
  yue: TranslateResult;
  cmn: TranslateResult;
}

/**
 * Translates English text to both Cantonese (Traditional) and Mandarin
 * (Simplified) in parallel — used for the ad-hoc "translate as a
 * destination" card and for driver notes.
 */
export async function translateToBoth(
  text: string,
  onStage?: (stage: 'yue' | 'cmn', partial: string) => void,
): Promise<BilingualTranslation> {
  const [yue, cmn] = await Promise.all([
    translateOnce({ text, source: 'en', target: 'yue' }, partial => onStage?.('yue', partial)),
    translateOnce({ text, source: 'en', target: 'cmn' }, partial => onStage?.('cmn', partial)),
  ]);
  return { yue, cmn };
}
