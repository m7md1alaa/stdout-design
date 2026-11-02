import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "@/components/ui/menu";

interface ExportMenuProps {
  busy: boolean;
  disabled: boolean;
  presetCount: number;
  exportShortcut?: string;
  onExport: () => void;
  onCopyImage: () => void;
  onExportAll: () => void;
}

/** Primary toolbar action: downloads the PNG, with copy and export-all in the menu. */
export const ExportMenu = ({
  busy,
  disabled,
  presetCount,
  exportShortcut,
  onExport,
  onCopyImage,
  onExportAll,
}: ExportMenuProps) => (
  <Menu>
    <MenuTrigger
      render={<Button disabled={disabled} loading={busy} size="sm" />}
    >
      Export
      <ChevronDownIcon className="size-3.5" />
    </MenuTrigger>
    <MenuPopup>
      <MenuItem onClick={onExport}>
        Download PNG
        {exportShortcut ? <MenuShortcut>{exportShortcut}</MenuShortcut> : null}
      </MenuItem>
      <MenuItem onClick={onCopyImage}>Copy image</MenuItem>
      <MenuSeparator />
      <MenuItem disabled={presetCount < 2} onClick={onExportAll}>
        Export all presets
        <MenuShortcut>{presetCount}</MenuShortcut>
      </MenuItem>
    </MenuPopup>
  </Menu>
);
