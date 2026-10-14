import { en, type Strings } from "./en";
import { ptBR } from "./pt-BR";

export type Locale = "en-US" | "pt-BR";

/** Picks the UI locale from a BCP 47 language tag. English is the default. */
export function detectLocale(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";
}

export function stringsFor(locale: Locale): Strings {
  return locale === "pt-BR" ? ptBR : en;
}

export const locale: Locale = detectLocale(
  typeof navigator === "undefined" ? undefined : navigator.language,
);

/** Strings for the active locale. */
export const t: Strings = stringsFor(locale);
