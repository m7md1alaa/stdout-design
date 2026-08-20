import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <Label
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-content-tertiary"
        htmlFor="template-select"
      >
        Template
      </Label>
      <Select
        onValueChange={(next) => onChange(next as string)}
        value={selected ?? undefined}
      >
        <SelectTrigger className="w-full" id="template-select">
          <SelectValue placeholder="Select a template" />
        </SelectTrigger>
        <SelectPopup>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.id}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
};
