import { API_ROUTES } from "../constants";

interface PresetData {
  id: string;
  width: number;
  height: number;
  platform: string;
}

interface MultiPresetViewProps {
  templateId: string | null;
  presets: PresetData[];
  selectedPreset: string | null;
  onSelectPreset: (id: string) => void;
}

export const MultiPresetView = ({
  templateId,
  presets,
  selectedPreset,
  onSelectPreset,
}: MultiPresetViewProps) => {
  if (!templateId || presets.length === 0) {
    return null;
  }

  const preselectedPresets = presets.slice(0, 3);

  return (
    <div className="multi-preset">
      <div className="multi-preset-previews">
        {preselectedPresets.map((preset) => {
          const scale = Math.min(1, 150 / preset.width, 120 / preset.height);

          return (
            <div
              key={preset.id}
              className={`multi-preset-item ${selectedPreset === preset.id ? "active" : ""}`}
              onClick={() => onSelectPreset(preset.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSelectPreset(preset.id);
                }
              }}
            >
              <div
                className="multi-preset-thumb"
                style={{
                  background: "var(--bg-tertiary)",
                  borderRadius: "4px",
                  height: Math.round(preset.height * scale),
                  overflow: "hidden",
                  width: Math.round(preset.width * scale),
                }}
              >
                <img
                  src={`${API_ROUTES.render}?templateId=${templateId}&preset=${preset.id}`}
                  alt={preset.id}
                  style={{ height: "100%", objectFit: "cover", width: "100%" }}
                />
              </div>
              <span className="multi-preset-label">{preset.id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
