export const TRANSLATION_NAMES: Record<string, string> = {
  en: 'English', 'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)', ja: 'Japanese', ko: 'Korean',
  bn: 'Bengali', ur: 'Urdu', hi: 'Hindi', ar: 'Arabic', es: 'Spanish', pt: 'Portuguese', 'pt-BR': 'Portuguese (Brazil)',
  de: 'German', fr: 'French', id: 'Indonesian', it: 'Italian', ru: 'Russian', tr: 'Turkish', vi: 'Vietnamese', th: 'Thai',
  ms: 'Malay', tl: 'Filipino', fa: 'Persian', ps: 'Pashto', he: 'Hebrew', uk: 'Ukrainian', pl: 'Polish', nl: 'Dutch',
  sv: 'Swedish', da: 'Danish', no: 'Norwegian', fi: 'Finnish', el: 'Greek', ro: 'Romanian', hu: 'Hungarian', cs: 'Czech',
  sk: 'Slovak', bg: 'Bulgarian', sr: 'Serbian', hr: 'Croatian', bs: 'Bosnian', sq: 'Albanian', ta: 'Tamil', te: 'Telugu',
  kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati', pa: 'Punjabi', ne: 'Nepali', si: 'Sinhala', my: 'Burmese',
  km: 'Khmer', lo: 'Lao', mn: 'Mongolian', kk: 'Kazakh', uz: 'Uzbek', az: 'Azerbaijani', ka: 'Georgian', hy: 'Armenian',
  sw: 'Swahili', af: 'Afrikaans', am: 'Amharic', so: 'Somali', ha: 'Hausa', yo: 'Yoruba', ig: 'Igbo', zu: 'Zulu',
  et: 'Estonian', lv: 'Latvian', lt: 'Lithuanian', ca: 'Catalan', ga: 'Irish', cy: 'Welsh', is: 'Icelandic', eo: 'Esperanto',
};
const NATIVE_NAMES: Record<string, string> = {
  'zh-CN': '简体中文 中文', 'zh-TW': '繁體中文 中文', ja: '日本語', ko: '한국어', bn: 'বাংলা Bangla', ur: 'اردو',
  hi: 'हिन्दी हिंदी', ar: 'العربية', es: 'Español', pt: 'Português', 'pt-BR': 'Português Brasil', de: 'Deutsch',
  fr: 'Français', id: 'Bahasa Indonesia', fa: 'فارسی', he: 'עברית', ru: 'Русский', ta: 'தமிழ்', te: 'తెలుగు',
};
// The installed offline M2M100 vocabulary has no Telugu/Esperanto tokens.
// Keep names for existing profiles, but never offer a target we cannot serve.
export const TRANSLATION_LANGUAGES = Object.entries(TRANSLATION_NAMES)
  .filter(([code]) => code !== 'te' && code !== 'eo')
  .map(([code, name]) => ({ code, name, nativeName: NATIVE_NAMES[code] || '' }));