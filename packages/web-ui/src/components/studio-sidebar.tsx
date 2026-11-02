import type { StudioState } from "@/hooks/use-studio-state";

import { PropPanel } from "./prop-panel";

/** What this panel actually reads off StudioState — narrower than the full shape. */
type InspectorStudio = Pick<
  StudioState,
  | "currentTemplate"
  | "displayValues"
  | "handleListOp"
  | "handlePropChange"
  | "handleResetField"
  | "isFieldModified"
  | "isLocalized"
  | "layerLocale"
  | "validationErrors"
>;

interface StudioSidebarProps {
  studio: InspectorStudio;
}

/** Says which locale the tagged fields are edited for, and what stays shared. */
const LocaleNote = ({ locale }: { locale: string }) => (
  <p className="border-border text-muted-foreground border-b px-4 py-2.5 text-xs leading-relaxed">
    Editing <span className="text-foreground font-mono">{locale}</span>. Fields
    tagged <span className="font-mono">{locale}</span> change this locale only;
    everything else is shared.
  </p>
);

/** The right-hand inspector: the current template's props. */
export const StudioSidebar = ({ studio }: StudioSidebarProps) => {
  const { layerLocale, isLocalized } = studio;
  return (
    <aside className="border-border bg-card flex w-80 shrink-0 flex-col overflow-x-hidden overflow-y-auto border-l">
      {studio.currentTemplate ? (
        <>
          {layerLocale ? <LocaleNote locale={layerLocale} /> : null}
          <PropPanel
            editor={{
              change: studio.handlePropChange,
              listOp: studio.handleListOp,
              localeFor: (path) =>
                layerLocale && isLocalized(path) ? layerLocale : undefined,
            }}
            errors={studio.validationErrors}
            inspector={studio.currentTemplate.inspector}
            isModified={studio.isFieldModified}
            onReset={studio.handleResetField}
            schema={studio.currentTemplate.propsSchema}
            values={studio.displayValues}
          />
        </>
      ) : (
        <div className="text-muted-foreground px-5 py-10 text-center">
          Select a template to begin
        </div>
      )}
    </aside>
  );
};
