import { useAppStore } from '@/store/appStore';
import { STRINGS } from './strings';

type Section = keyof typeof STRINGS.en;

/** Scoped to one section (e.g. 'settings') so call sites read as
 * `t('currencySymbol')` instead of `t('settings.currencySymbol')`
 * everywhere. Falls back to English for any key a translation hasn't
 * reached yet, so a partially-translated section never shows blank. */
export function useTranslation<S extends Section>(section: S) {
  const language = useAppStore((s) => s.settings.language);
  return function t(key: keyof (typeof STRINGS.en)[S], vars?: Record<string, string>): string {
    const dict = STRINGS[language][section] as Record<string, string>;
    const fallback = STRINGS.en[section] as Record<string, string>;
    let text = dict[key as string] ?? fallback[key as string] ?? String(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
    }
    return text;
  };
}
