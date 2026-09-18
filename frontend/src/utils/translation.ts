import type { TextStyle } from 'react-native';
import { api, getAuthToken } from '@/src/utils/api';

export interface TranslationInput { text: string; target_language?: string | null; source_language?: string; }
export interface TranslationResult { translated: string; target_language: string; source_language: string; cached: boolean; unchanged?: boolean; provider?: string; }
const pending = new Map<string, Promise<TranslationResult>>();

async function perform(input: TranslationInput, signal?: AbortSignal): Promise<TranslationResult> {
  if (!input.text.trim()) throw new Error('Enter some text to translate.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel);
  const timeout = setTimeout(cancel, 75000);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const value = await api.post<TranslationResult>('/ai/translate', input, { signal: controller.signal });
        if (!value || typeof value.translated !== 'string' || !value.translated.trim()) throw new Error('The translation was incomplete. Please retry.');
        return value;
      } catch (error) {
        if (controller.signal.aborted) throw new Error(signal?.aborted ? 'Translation cancelled.' : 'Translation took too long. Please retry.');
        // The server handles provider retries/Retry-After. Only retry transport loss here.
        if (attempt || (error as { status?: number }).status !== undefined) throw error;
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    throw new Error('Please retry the translation.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

export function requestTranslation(input: TranslationInput, signal?: AbortSignal): Promise<TranslationResult> {
  if (signal) return perform(input, signal);
  // Memory only; scoped to the current session, removed immediately on completion.
  const key = JSON.stringify([getAuthToken(), input.target_language, input.source_language, input.text]);
  const existing = pending.get(key);
  if (existing) return existing;
  const task = perform(input).finally(() => { if (pending.get(key) === task) pending.delete(key); });
  pending.set(key, task);
  return task;
}

export function translatedTextStyle(text: string): TextStyle {
  const first = text.match(/[A-Za-z\u0590-\u08FF\u0900-\uFFFF]/)?.[0] || '';
  const rtl = /^[\u0590-\u08FF]/.test(first);
  return { writingDirection: rtl ? 'rtl' : 'ltr', textAlign: rtl ? 'right' : 'left' };
}