interface TemplateOption {
  id: string;
  description: string;
}

interface TemplateSelectorProps {
  templates: TemplateOption[];
  selected: string | null;
  onChange: (id: string) => void;
}

export const TemplateSelector = ({
  templates,
  selected,
  onChange,
}: TemplateSelectorProps) => {
  if (templates.length === 0) {
    return (
      <div className="border-b border-border px-5 py-4 italic text-content-tertiary">
        <p>No templates found</p>
      </div>
    );
  }

  return (
    <div className="border-b border-border px-5 py-4">
      <label
        htmlFor="template-select"
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary"
      >
        Template
      </label>
      <select
        id="template-select"
        value={selected ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-sm border border-border bg-surface-tertiary select-chevron px-2.5 py-2 text-sm text-content focus:border-accent focus:outline-none"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.id}
          </option>
        ))}
      </select>
    </div>
  );
};
