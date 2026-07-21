interface LocaleBarProps {
  locales: string[];
  selected: string | null;
  onChange: (locale: string) => void;
}

export const LocaleBar = ({ locales, selected, onChange }: LocaleBarProps) => {
  if (locales.length === 0) {
    return null;
  }

  return (
    <div className="flex overflow-x-auto border-b border-border bg-surface-secondary">
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`cursor-pointer whitespace-nowrap border-none bg-none px-4 py-2.5 text-xs font-semibold text-content-tertiary transition-colors hover:text-content-secondary ${selected === locale ? "border-b-2 border-accent text-accent" : "border-b-2 border-transparent"}`}
          onClick={() => {
            onChange(locale);
          }}
        >
          {locale}
        </button>
      ))}
    </div>
  );
};
