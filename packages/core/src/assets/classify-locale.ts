export interface LocaleClassification {
  lang: string | undefined;
  needsArabic: boolean;
}

export const classifyLocale = (localeId: string): LocaleClassification => {
  const isArabic = localeId.startsWith("ar");
  return {
    lang: isArabic ? "ar" : undefined,
    needsArabic: isArabic,
  };
};
