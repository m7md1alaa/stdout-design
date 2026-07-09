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
      <div className="template-selector empty">
        <p>No templates found</p>
      </div>
    );
  }

  return (
    <div className="template-selector">
      <label htmlFor="template-select">Template</label>
      <select
        id="template-select"
        value={selected ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.id}
          </option>
        ))}
      </select>
    </div>
  );
}
