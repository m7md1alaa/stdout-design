export interface OgTemplateProps {
  title: string;
  description?: string;
  siteName?: string;
}

const getTitleSize = (length: number): string => {
  if (length > 60) {
    return "48px";
  }
  if (length > 35) {
    return "60px";
  }
  return "76px";
};

// Helper function to safely truncate long description text
const truncateText = (text: string, maxLength: number = 130): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}…`;
};

export const StandardOgTemplate = ({
  title,
  description,
  siteName,
}: OgTemplateProps) => {
  const titleSize = getTitleSize(title.length);
  const truncatedDescription = description
    ? truncateText(description, 130)
    : null;

  return (
    <div
      style={{
        backgroundColor: "#0a0a0b",
        color: "#e4e4e7",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px 56px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "linear-gradient(90deg, #6366f1 0%, #818cf8 100%)",
          height: "4px",
          left: "0",
          position: "absolute",
          right: "0",
          top: "0",
        }}
      />

      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: "10px",
        }}
      >
        <div
          style={{
            backgroundColor: "#6366f1",
            borderRadius: "50%",
            flexShrink: "0",
            height: "10px",
            width: "10px",
          }}
        />
        {siteName ? (
          <span
            style={{
              color: "#71717a",
              fontSize: "18px",
              fontWeight: "500",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {siteName}
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flex: "1",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: "860px",
          paddingTop: "24px",
        }}
      >
        <h1
          style={{
            color: "#fafafa",
            fontSize: titleSize,
            fontWeight: "700",
            letterSpacing: "-0.02em",
            lineHeight: "1.1",
            margin: "0",
          }}
        >
          {title}
        </h1>

        {truncatedDescription ? (
          <p
            style={{
              color: "#a1a1aa",
              display: "flex",
              fontSize: "26px",
              fontWeight: "400",
              lineHeight: "1.5",
              margin: "0",
              marginTop: "24px",
            }}
          >
            {truncatedDescription}
          </p>
        ) : null}
      </div>

      <div
        style={{
          backgroundColor: "#27272a",
          height: "1px",
          marginBottom: "0",
          width: "100%",
        }}
      />
    </div>
  );
};
