export interface HomeOgTemplateProps {
  title: string;
  description?: string;
  siteName?: string;
}

const truncateText = (text: string, maxLength = 180): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}…`;
};

const MONO_FONT =
  "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Code', Menlo, Consolas, monospace";

export function HomeOgTemplate({
  title,
  description,
  siteName,
}: HomeOgTemplateProps) {
  const truncatedDescription = description
    ? truncateText(description, 180)
    : null;

  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
        display: "flex",
        flexDirection: "column",
        fontFamily: MONO_FONT,
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px 56px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          inset: "0",
          pointerEvents: "none",
          position: "absolute",
        }}
      />
      <div
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(207,139,254,0.32) 0%, transparent 70%)",
          inset: "0",
          pointerEvents: "none",
          position: "absolute",
        }}
      />

      <div
        style={{
          background: "linear-gradient(90deg, #855aa3 0%, #cf8bfe 100%)",
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
          gap: "12px",
          position: "relative",
        }}
      >
        <div
          style={{
            backgroundColor: "#cf8bfe",
            borderRadius: "2px",
            flexShrink: "0",
            height: "12px",
            width: "12px",
          }}
        />
        {siteName ? (
          <span
            style={{
              color: "#7d7882",
              fontSize: "18px",
              fontWeight: "500",
              letterSpacing: "0.06em",
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
          maxWidth: "940px",
          paddingTop: "24px",
          position: "relative",
        }}
      >
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              color: "#fafafa",
              fontSize: "40px",
              fontWeight: "600",
              letterSpacing: "-0.02em",
              lineHeight: "1.12",
              margin: "0",
            }}
          >
            {title}
          </h1>
          <span
            style={{
              color: "#cf8bfe",
              fontSize: "40px",
              fontWeight: "600",
              lineHeight: "1.12",
            }}
          >
            _
          </span>
        </div>

        {truncatedDescription ? (
          <p
            style={{
              color: "#9a94a0",
              display: "flex",
              fontSize: "18px",
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

      <div style={{ position: "relative" }}>
        <div
          style={{
            backgroundColor: "#262626",
            height: "1px",
            marginBottom: "0",
            width: "100%",
          }}
        />
        <div
          style={{
            color: "#7d7882",
            display: "flex",
            fontSize: "16px",
            justifyContent: "space-between",
            marginTop: "24px",
          }}
        >
          <span>TSX pixels</span>
          <span>og:home</span>
        </div>
      </div>
    </div>
  );
}
