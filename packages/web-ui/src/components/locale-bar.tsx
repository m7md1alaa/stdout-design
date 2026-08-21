import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="border-border bg-surface-secondary overflow-x-auto border-b">
      <Tabs
        onValueChange={(next) => onChange(next as string)}
        value={selected ?? undefined}
      >
        <TabsList
          className="*:data-[slot=tabs-tab]:hover:bg-surface-hover w-full justify-start gap-0 rounded-none bg-transparent p-0"
          variant="underline"
        >
          {locales.map((locale) => (
            <TabsTrigger
              className="rounded-none px-4 py-2.5 text-xs font-semibold"
              key={locale}
              value={locale}
            >
              {locale}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};
