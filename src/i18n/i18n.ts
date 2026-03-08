// Lightweight i18n module — reads language from localStorage, returns translated strings.
import { en } from "./en";
import { nl } from "./nl";

export type Language = "en" | "nl";

const TRANSLATIONS: Record<Language, Record<string, string>> = { en, nl };

const LS_KEY = "game_settings";

let _lang: Language = "en";

// Initialise from localStorage (called once at module load)
try {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.language === "nl") _lang = "nl";
  }
} catch { /* ignore */ }

/** Current language code. */
export function getLanguage(): Language { return _lang; }

/** Change language, persist, and reload the page so all UIs pick it up. */
export function setLanguage(lang: Language): void {
  _lang = lang;
  try {
    const raw = localStorage.getItem(LS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data.language = lang;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
  location.reload();
}

/** Look up a translated string by key. Falls back to English, then to the key itself. */
export function t(key: string): string {
  return TRANSLATIONS[_lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
